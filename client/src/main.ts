import * as THREE from 'three';
import {
  CUSHION_POSITIONS,
  DISCONNECT_FADE_MS,
  EXP_REWARDS,
  INCENSE_BURN_DURATION_MS,
  INCENSE_PRAY_DURATION_MS,
  INCENSE_STAND_POS,
  MAX_INCENSE_IN_BURNER,
  MAX_INCENSE_PER_PLAYER,
  PlayerAction,
  ReligionMode,
  RobeColor,
  getLevelFromExp,
  getMilestoneInfo,
  isCatholicRoom
} from '../../shared/constants';
import { setupTempleLighting } from './scene/lighting';
import {
  buildTempleArchitecture,
  ThirdPersonCameraController,
  countSceneTriangles
} from './scene/temple';
import { buildTempleProps, SyncedIncenseData } from './scene/props';
import { buildTempleArchitecture as buildCathedralArchitecture } from './scene/cathedralArch';
import { buildTempleProps as buildCathedralProps } from './scene/cathedralProps';
import { createCharacter, CharacterInstance } from './player/character';
import { updateCharacterAnimation } from './player/animations';
import {
  PlayerMovementController,
  interpolateRemotePlayer
} from './player/movement';
import { SoundEffectsManager } from './audio/sfx';
import { RoomRadioPlayer } from './audio/roomRadio';
import { GameNetworkClient, RemotePlayerState, LobbyRoomItem } from './net/client';
import { LobbyUI } from './ui/lobby';
import { GameHUD, LeaderboardEntry } from './ui/hud';
import { ChatUI } from './ui/chat';
import { SettingsUI } from './ui/settings';

class ChuaOnlineApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  private lighting: ReturnType<typeof setupTempleLighting>;
  private templeEnv: ReturnType<typeof buildTempleArchitecture>;
  private propsManager: ReturnType<typeof buildTempleProps>;
  private cathedralEnv: ReturnType<typeof buildCathedralArchitecture>;
  private cathedralProps: ReturnType<typeof buildCathedralProps>;
  private religionMode: ReligionMode = 'buddhist';
  private cachedLobbyRooms: LobbyRoomItem[] = [];
  private cameraController: ThirdPersonCameraController;

  private localPlayer: CharacterInstance;
  private movementController: PlayerMovementController;
  private remotePlayers = new Map<string, CharacterInstance>();

  private sfx = new SoundEffectsManager();
  private radio = new RoomRadioPlayer();
  private netClient: GameNetworkClient;

  private lobbyUI: LobbyUI;
  private hud: GameHUD;
  private chatUI: ChatUI;
  private settingsUI: SettingsUI;

  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private isSoloOfflineMode = false;
  private soloIncenseSticks: SyncedIncenseData[] = [];
  private currentRoomCapacity = 50;
  private sutraReadingInterval?: number;
  private chantVoiceAudio = new Audio();

  constructor() {
    const canvasContainer = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.15,
      95
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio <= 1.5,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    canvasContainer.appendChild(this.renderer.domElement);

    // 1. Dựng ánh sáng, kiến trúc Chánh điện Chùa & Thánh đường Nhà Thờ 30x18m
    this.lighting = setupTempleLighting(this.scene);
    this.templeEnv = buildTempleArchitecture(this.scene);
    this.propsManager = buildTempleProps(this.scene);
    this.cathedralEnv = buildCathedralArchitecture(this.scene);
    this.cathedralProps = buildCathedralProps(this.scene);
    this.cathedralEnv.root.visible = false;
    const catPropsRoot = this.scene.getObjectByName('CathedralProps');
    if (catPropsRoot) catPropsRoot.visible = false;

    // 2. Khởi tạo nhân vật chính (kèm cấp độ & kinh nghiệm đã lưu)
    const savedExp = Math.max(0, Number(localStorage.getItem('chua_online_exp') || 0));
    const savedLevel = getLevelFromExp(savedExp);
    this.localPlayer = createCharacter('local', 'Chú Tiểu', 'brown');
    this.localPlayer.setLevelAndExp(savedLevel, savedExp, 'buddhist');
    this.localPlayer.root.position.set(0, 0, 12.5);
    this.localPlayer.root.rotation.y = 0; // Nhìn thẳng về hướng tượng Phật (-Z)
    this.scene.add(this.localPlayer.root);

    this.cameraController = new ThirdPersonCameraController(
      this.camera,
      this.renderer.domElement
    );
    this.movementController = new PlayerMovementController(this.localPlayer, this.scene);

    const totalTriangles = countSceneTriangles(this.scene);
    console.log(`[Chùa Online] Tổng số đa giác cảnh 3D: ${totalTriangles} (< 200.000)`);

    // 3. Khởi tạo giao diện HUD, Chat, Settings, Lobby và Mạng Colyseus
    this.hud = new GameHUD({
      onTogglePray: () => this.handleTogglePray(),
      onToggleBow: () => this.handleToggleBow(),
      onToggleBeadsModal: (open) => this.handleToggleBeads(open),
      onRequestOfferIncense: () => this.handleOfferIncenseSequence(),
      onBeadPulled: (currentCount) => {
        this.sfx.playBeadClick();
        const isRoundDone = currentCount === 0;
        this.awardLocalAndServerExp(
          isRoundDone ? EXP_REWARDS.BEAD_ROUND_BONUS : EXP_REWARDS.BEAD_CLICK,
          isRoundDone ? 'Hoàn thành 1 vòng chuỗi hạt' : 'Lần chuỗi hạt'
        );
      },
      onChantPhrase: (phrase) => this.handleChantPhrase(phrase),
      onStartSutraReading: (lines, title) => this.handleStartSutraReading(lines, title),
      onStopSutraReading: () => this.handleStopSutraReading(),
      onDrawFortuneStick: (fortune) => {
        this.sfx.playMo();
        setTimeout(() => this.sfx.playBell(), 320);
        this.activeProps.triggerHaloPulse(12);
        this.localPlayer.action = 'pray';
        this.hud.updateActionButtonsState('pray');
        this.netClient.sendSetAction('pray');
        const prefix = this.religionMode === 'catholic' ? '📜' : '🎋';
        this.localPlayer.showChatBubble(`${prefix} ${fortune.number}: ${fortune.title}`, true, 6500);
        this.speakVietnameseChant(`${fortune.number}, ${fortune.rank}. ${fortune.title}`);
        this.awardLocalAndServerExp(
          EXP_REWARDS.DRAW_FORTUNE,
          this.religionMode === 'catholic' ? 'Rút Lộc Thánh Lời Chúa' : 'Xin xăm Quan Âm'
        );
      },
      onHangWishOnTree: (wishText) => {
        this.activeProps.addWishingRibbonToTree();
        this.sfx.playBell();
        this.activeProps.triggerHaloPulse(10);
        this.hud.addWishEntry(this.localPlayer.name, wishText);
        this.hud.showToast(
          this.religionMode === 'catholic'
            ? '🌿 Đã treo Lời Nguyện Cầu lên Cây Phước Lành!'
            : '🏮 Đã treo Thẻ Cầu An lên Cây Bồ Đề!'
        );
        const fullWish = `🏮 Cầu nguyện: ${wishText}`;
        this.localPlayer.showChatBubble(fullWish, true, 6500);
        this.speakVietnameseChant(wishText);
        if (!this.isSoloOfflineMode) {
          this.netClient.sendChant(fullWish);
        }
        this.awardLocalAndServerExp(EXP_REWARDS.ADD_WISH, 'Treo thẻ ước nguyện');
      },
      onCycleTimeOfDay: (mode) => {
        this.lighting.setTimeOfDay(mode);
        const names = {
          morning: '☀️ Khung cảnh: Ban Ngày Thanh Tịnh',
          sunset: '🌇 Khung cảnh: Hoàng Hôn Chiều Tà',
          night: '🏮 Khung cảnh: Đêm Hoa Đăng Lung Linh'
        };
        this.hud.showToast(names[mode]);
      },
      onToggleReligionMode: () => {
        this.handleSwitchReligionModeInGame();
      },
      onOpenSettings: () => this.settingsUI.show(),
      onOpenLobby: () => this.handleLeaveRoomToLobby(),
      onToggleChat: () => {
        if (this.chatUI.isHidden()) {
          this.chatUI.show();
          this.chatUI.setCollapsed(false);
        } else {
          this.chatUI.setCollapsed(!this.chatUI.isChatCollapsed());
        }
      },
      onJoystickMove: (jx, jz) => {
        if (Math.hypot(jx, jz) > 0.1 && this.localPlayer.action === 'bow') {
          this.netClient.stopBow();
          this.hud.updateActionButtonsState('walk');
        }
        this.movementController.setJoystickVector(jx, jz);
      },
      onZoomCamera: (delta) => {
        this.cameraController.zoomBy(delta);
      }
    });

    this.chatUI = new ChatUI({
      onSendMessage: (text) => {
        // Hiện ngay bong bóng chat nhảy trên đầu nhân vật của mình
        this.localPlayer.showChatBubble(text, false, 6500);

        if (this.isSoloOfflineMode) {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          this.chatUI.updateMessages([
            {
              id: `solo_${Date.now()}`,
              senderId: 'local',
              senderName: this.localPlayer.name,
              timeString: `${hh}:${mm}`,
              text
            }
          ]);
        } else {
          this.netClient.sendChat(text);
        }
      },
      onReportMessage: (messageId) => {
        this.netClient.reportChatMessage(messageId);
        this.hud.showToast('Đã ẩn tin nhắn và gửi báo cáo về máy chủ');
      }
    });

    this.settingsUI = new SettingsUI({
      onMusicVolumeChange: (vol) => this.radio.setVolume(vol),
      onSfxVolumeChange: (vol) => this.sfx.setVolume(vol),
      onToggleMuteAll: (muted) => {
        this.radio.setMuted(muted);
        this.sfx.setMuted(muted);
        if (muted) {
          this.chantVoiceAudio.pause();
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }
      },
      onToggleHideChat: (hidden) => {
        if (hidden) this.chatUI.hide();
        else this.chatUI.show();
      },
      onChangeCustomTrack: (urlOrSpec, title) => {
        this.radio.selectCustomTrack(urlOrSpec, title, (streamUrl, finalTitle) => {
          this.hud.showToast(`🎶 Đang phát: ${finalTitle}`);
          if (!this.isSoloOfflineMode) {
            this.netClient.sendChangeRoomTrack(streamUrl, finalTitle);
          }
        });
      },
      onLeaveRoom: () => this.handleLeaveRoomToLobby()
    });

    this.netClient = new GameNetworkClient({
      onLobbyRoomsUpdated: (rooms) => {
        this.cachedLobbyRooms = rooms;
        this.lobbyUI.updateRoomsList(rooms);
      },
      onJoinedTempleRoom: (info) => {
        this.isSoloOfflineMode = false;
        this.currentRoomCapacity = info.maxCapacity || 50;
        for (const remote of this.remotePlayers.values()) {
          this.scene.remove(remote.root);
          remote.dispose();
        }
        this.remotePlayers.clear();

        const mode: ReligionMode = isCatholicRoom(info.theme, info.roomName)
          ? 'catholic'
          : 'buddhist';
        this.setReligionMode(mode);
        this.rebuildLocalPlayerAppearance(info.assignedName, this.localPlayer.robeColor);
        this.netClient.sendMove(
          this.localPlayer.root.position.x,
          this.localPlayer.root.position.z,
          this.localPlayer.root.rotation.y,
          this.localPlayer.action
        );

        this.lobbyUI.hide();
        this.hud.show();
        this.chatUI.show();

        this.hud.updateRoomHeader({
          roomName: info.roomName,
          roomCode: info.isPrivate ? info.roomCode : '',
          playerCount: 1 + this.remotePlayers.size,
          maxCapacity: this.currentRoomCapacity
        });

        if (info.isPrivate && info.roomCode) {
          this.hud.showToast(`Đã vào phòng riêng! Mã mời bạn bè: ${info.roomCode}`, 5000);
        }
      },
      onPlayersChanged: (playersMap, mySessionId) => {
        this.syncPlayersFromServer(playersMap, mySessionId);
      },
      onIncenseChanged: (sticks) => {
        this.propsManager.syncIncenseSticks(sticks);
        this.cathedralProps.syncIncenseSticks(sticks);
      },
      onChatMessagesChanged: (messages) => {
        this.chatUI.updateMessages(messages);
      },
      onChatError: (errMsg) => {
        this.chatUI.showError(errMsg);
      },
      onHeadBubble: (payload) => {
        const myId = this.netClient.getSessionId();
        if (payload.senderId === myId) {
          this.localPlayer.showChatBubble(payload.text, payload.isChant, 6500);
        } else {
          const remote = this.remotePlayers.get(payload.senderId);
          if (remote) {
            remote.showChatBubble(payload.text, payload.isChant, 6500);
          }
        }
        if (payload.isChant) {
          this.activeProps.triggerHaloPulse(8);
        }
      },
      onExpGained: (payload) => {
        try {
          localStorage.setItem('chua_online_exp', String(payload.totalExp));
        } catch {
          // Ignore storage error
        }
        this.localPlayer.setLevelAndExp(payload.level, payload.totalExp, this.religionMode);
        this.hud.updateLevelProgress(
          payload.level,
          payload.totalExp,
          payload.amount,
          payload.reason
        );
      },
      onPlayerLevelUp: (payload) => {
        this.sfx.playBell();
        this.activeProps.triggerHaloPulse(15);
        const myId = this.netClient.getSessionId();
        if (payload.sessionId === myId) {
          this.localPlayer.triggerLevelUpBurst();
        } else {
          this.remotePlayers.get(payload.sessionId)?.triggerLevelUpBurst();
        }
        this.hud.showToast(
          `🎉 Chúc mừng ${payload.name} đạt ${payload.badgeIcon} Cấp ${payload.level} (${payload.title}) — Mở khóa: ${payload.effectName}!`,
          6000
        );
      },
      onAudioSync: (payload) => {
        this.radio.syncWithServer(payload);
        this.hud.updateRoomHeader({
          nowPlayingTitle: payload.trackTitle
        });
      },
      onBowResult: (res) => {
        if (!res.ok) {
          this.hud.showToast(res.message || 'Đã hết chỗ, vui lòng đợi');
          return;
        }
        if (typeof res.x === 'number' && typeof res.z === 'number' && typeof res.cushionIndex === 'number') {
          const cushionIdx = res.cushionIndex;
          this.movementController.navigateToPoint(res.x, res.z, 0, () => {
            this.localPlayer.action = 'bow';
            this.localPlayer.animTime = 0;
            this.hud.updateActionButtonsState('bow');
            this.activeProps.triggerHaloPulse(12);
            this.netClient.startBowAtCushion(cushionIdx);
          });
        }
      },
      onIncenseResult: (res) => {
        if (!res.ok) {
          this.hud.showToast(res.message || 'Không thể dâng');
        } else {
          this.sfx.playBell();
          this.activeProps.triggerHaloPulse(15);
          this.hud.showToast(
            this.religionMode === 'catholic'
              ? '✝️ Đã thắp 1 ngọn nến cầu nguyện trước Cung Thánh (+35 Ân Sủng)'
              : '🙏 Nam Mô A Di Đà Phật — Đã dâng 1 nén tâm hương lên lư đồng (+35 Công Đức)'
          );
        }
      },
      onReconnectingState: (reconnecting, msg) => {
        this.hud.setReconnectingBanner(reconnecting, msg || 'Đang kết nối lại...');
        if (!reconnecting && msg) {
          this.hud.showToast(msg, 4500);
          this.handleLeaveRoomToLobby();
        }
      }
    });

    this.lobbyUI = new LobbyUI({
      onUnlockAudioFromGesture: () => {
        this.radio.unlockFromUserGesture();
        this.sfx.unlockFromUserGesture();
      },
      onSelectReligionMode: (mode) => {
        this.setReligionMode(mode);
      },
      onQuickEnterReligionMode: async ({ mode, playerName, robeColor }) => {
        this.setReligionMode(mode);
        this.rebuildLocalPlayerAppearance(playerName, robeColor);
        await this.joinPreferredReligionRoom(mode, playerName, robeColor);
      },
      onJoinRoomRequest: async ({ roomId, playerName, robeColor, roomCode }) => {
        this.rebuildLocalPlayerAppearance(playerName, robeColor);
        return await this.netClient.joinTempleRoom(roomId, {
          name: playerName,
          robeColor,
          roomCode,
          initialExp: this.localPlayer.exp
        });
      },
      onCreateRoomRequest: async ({
        roomName,
        theme,
        maxClients,
        isPrivate,
        roomCode,
        playerName,
        robeColor
      }) => {
        this.rebuildLocalPlayerAppearance(playerName, robeColor);
        const created = await this.netClient.createTempleRoom({
          roomName,
          theme,
          maxClients,
          isPrivate,
          roomCode
        });
        if (!created.ok || !created.roomId) {
          return { ok: false, message: created.message || 'Không thể tạo phòng' };
        }
        return await this.netClient.joinTempleRoom(created.roomId, {
          name: playerName,
          robeColor,
          roomCode: created.roomCode,
          initialExp: this.localPlayer.exp
        });
      },
      onJoinByCodeRequest: async ({ roomCode, playerName, robeColor }) => {
        this.rebuildLocalPlayerAppearance(playerName, robeColor);
        const verified = await this.netClient.verifyRoomCode({ roomCode });
        if (!verified.ok || !verified.roomId) {
          return { ok: false, message: verified.message || 'Mã phòng không hợp lệ' };
        }
        return await this.netClient.joinTempleRoom(verified.roomId, {
          name: playerName,
          robeColor,
          roomCode: verified.roomCode,
          initialExp: this.localPlayer.exp
        });
      },
      onPlaySoloOffline: (playerName, robeColor) => {
        this.startSoloMode(playerName, robeColor);
      }
    });

    this.radio.onTrackChange((title) => {
      this.hud.updateRoomHeader({ nowPlayingTitle: title });
    });

    this.bindScenePointerInteractions();
    this.bindResize();

    this.hud.updateLevelProgress(this.localPlayer.level, this.localPlayer.exp);
    this.netClient.connectLobby();
    this.animate();
  }

  private get activeProps() {
    return this.religionMode === 'catholic' ? this.cathedralProps : this.propsManager;
  }

  private get activeEnv() {
    return this.religionMode === 'catholic' ? this.cathedralEnv : this.templeEnv;
  }

  private setReligionMode(mode: ReligionMode): void {
    this.religionMode = mode;
    const isCath = mode === 'catholic';
    this.templeEnv.group.visible = !isCath;
    const templePropsRoot = this.scene.getObjectByName('TempleProps');
    if (templePropsRoot) templePropsRoot.visible = !isCath;

    this.cathedralEnv.root.visible = isCath;
    const catPropsRoot = this.scene.getObjectByName('CathedralProps');
    if (catPropsRoot) catPropsRoot.visible = isCath;

    this.localPlayer.setReligionMode(mode);
    for (const remote of this.remotePlayers.values()) {
      remote.setReligionMode(mode);
    }
    this.hud.setReligionMode(mode);
  }

  private async joinPreferredReligionRoom(
    mode: ReligionMode,
    playerName: string,
    robeColor: RobeColor
  ): Promise<void> {
    await this.netClient.connectLobby();
    let targetRoom = this.cachedLobbyRooms.find(
      (r) =>
        !r.isPrivate &&
        r.clients < r.maxClients &&
        (mode === 'catholic'
          ? isCatholicRoom(r.theme, r.roomName)
          : !isCatholicRoom(r.theme, r.roomName))
    );

    if (!targetRoom) {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (Array.isArray(data?.rooms)) {
          this.cachedLobbyRooms = data.rooms;
          targetRoom = this.cachedLobbyRooms.find(
            (r) =>
              !r.isPrivate &&
              r.clients < r.maxClients &&
              (mode === 'catholic'
                ? isCatholicRoom(r.theme, r.roomName)
                : !isCatholicRoom(r.theme, r.roomName))
          );
        }
      } catch {
        // Ignore fetch error
      }
    }

    if (targetRoom) {
      await this.netClient.joinTempleRoom(targetRoom.roomId, {
        name: playerName,
        robeColor,
        initialExp: this.localPlayer.exp
      });
    } else {
      const created = await this.netClient.createTempleRoom({
        roomName:
          mode === 'catholic' ? 'Nhà Thờ Chính Tòa Bốn Phương' : 'Chánh Điện Tụng Kinh Sáng',
        theme: mode === 'catholic' ? 'Nhà Thờ Công Giáo' : 'Chung',
        maxClients: 50,
        isPrivate: false
      });
      if (created.ok && created.roomId) {
        await this.netClient.joinTempleRoom(created.roomId, {
          name: playerName,
          robeColor,
          initialExp: this.localPlayer.exp
        });
      }
    }
  }

  private async handleSwitchReligionModeInGame(): Promise<void> {
    const nextMode: ReligionMode = this.religionMode === 'catholic' ? 'buddhist' : 'catholic';
    this.setReligionMode(nextMode);
    this.hud.showToast(
      nextMode === 'catholic'
        ? '⛪ Đã chuyển sang Chế Độ Đạo Thiên Chúa (Nhà Thờ Công Giáo)'
        : '⛩️ Đã chuyển sang Chế Độ Phật Giáo (Chùa Online)'
    );
    if (!this.isSoloOfflineMode) {
      await this.joinPreferredReligionRoom(
        nextMode,
        this.localPlayer.name,
        this.localPlayer.robeColor
      );
    } else {
      const isCath = nextMode === 'catholic';
      const soloTitle = isCath
        ? 'Piano Thánh Ca Không Lời - Nhạc Cầu Nguyện Tĩnh Tâm Trong Nhà Thờ'
        : 'Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng';
      this.hud.updateRoomHeader({
        roomName: isCath
          ? 'Thánh Đường Nhà Thờ (Đi dạo một mình)'
          : 'Chánh Điện Chùa (Đi dạo một mình)',
        nowPlayingTitle: soloTitle
      });
      this.radio.syncWithServer({
        trackId: isCath ? 'catholic_hymn_1' : 'yt_Qq6dBbRusdw',
        trackTitle: soloTitle,
        trackUrl: isCath ? '/audio/yt_0gurLbd6CvM.mp3' : '/audio/yt_Qq6dBbRusdw.mp3',
        trackDuration: 600,
        startTime: Date.now(),
        serverNow: Date.now()
      });
    }
  }

  private awardLocalAndServerExp(amount: number, reason: string): void {
    if (this.isSoloOfflineMode) {
      const prevLevel = this.localPlayer.level;
      const nextExp = this.localPlayer.exp + amount;
      const nextLevel = getLevelFromExp(nextExp);
      try {
        localStorage.setItem('chua_online_exp', String(nextExp));
      } catch {
        // Ignore
      }
      this.localPlayer.setLevelAndExp(nextLevel, nextExp, this.religionMode);
      this.hud.updateLevelProgress(nextLevel, nextExp, amount, reason);
      this.hud.updateLeaderboard([
        {
          id: 'local',
          name: this.localPlayer.name,
          level: nextLevel,
          exp: nextExp,
          isMe: true
        }
      ]);
      if (nextLevel > prevLevel) {
        const ms = getMilestoneInfo(nextLevel);
        const title = this.religionMode === 'catholic' ? ms.catholicTitle : ms.buddhistTitle;
        const eff = this.religionMode === 'catholic' ? ms.catholicEffect : ms.buddhistEffect;
        this.sfx.playBell();
        this.activeProps.triggerHaloPulse(15);
        this.hud.showToast(
          `🎉 Chúc mừng bạn đạt ${ms.badgeIcon} Cấp ${nextLevel} (${title}) — Mở khóa: ${eff}!`,
          6000
        );
      }
    } else {
      this.netClient.sendGainExp(amount, reason);
    }
  }

  private speakVietnameseChant(text: string): void {
    if (this.sfx.isMuted() || this.sfx.getVolume() <= 0.05) return;
    const cleaned = text.replace(/[🙏🪷🕯️📖✨🔔📿]/g, '').trim();
    if (!cleaned) return;

    // Ưu tiên phát giọng đọc tiếng Việt chuẩn từ endpoint /api/tts của Server
    try {
      const isViteDev = window.location.port === '5173';
      const apiBase = isViteDev
        ? `http://${window.location.hostname || 'localhost'}:2567`
        : '';
      this.chantVoiceAudio.pause();
      this.chantVoiceAudio.src = `${apiBase}/api/tts?text=${encodeURIComponent(cleaned)}`;
      this.chantVoiceAudio.volume = Math.min(1, this.sfx.getVolume());
      this.chantVoiceAudio.playbackRate = 0.92; // Giọng đọc kinh trầm ấm, khoan thai
      this.chantVoiceAudio.play().catch(() => {
        this.fallbackWebSpeechVietnamese(cleaned);
      });
    } catch {
      this.fallbackWebSpeechVietnamese(cleaned);
    }
  }

  private fallbackWebSpeechVietnamese(cleaned: string): void {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(cleaned);
      utter.lang = 'vi-VN';
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
      if (viVoice) utter.voice = viVoice;
      utter.rate = 0.85;
      utter.pitch = 0.92;
      utter.volume = Math.min(1, this.sfx.getVolume() * 0.9);
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore if speech synthesis is unavailable
    }
  }

  private handleChantPhrase(phrase: string): void {
    this.localPlayer.showChatBubble(phrase, true, 6500);
    this.sfx.playMo();
    this.speakVietnameseChant(phrase);
    this.propsManager.triggerHaloPulse(10);

    if (this.localPlayer.action === 'idle') {
      this.localPlayer.action = 'pray';
      this.hud.updateActionButtonsState('pray');
      this.netClient.sendSetAction('pray');
    }

    if (!this.isSoloOfflineMode) {
      this.netClient.sendChant(phrase);
    }
  }

  private handleStartSutraReading(lines: string[], title: string): void {
    this.handleStopSutraReading();
    if (lines.length === 0) return;

    this.movementController.cancelNavigation();
    this.localPlayer.action = 'pray';
    this.hud.updateActionButtonsState('pray');
    this.netClient.sendSetAction('pray');
    this.hud.showToast(`📖 Bắt đầu tụng: ${title}`);

    let idx = 0;
    const readLine = () => {
      if (idx >= lines.length) {
        this.handleStopSutraReading();
        this.hud.showToast(`🙏 Đã tụng xong bài ${title}`);
        return;
      }
      const line = lines[idx++];
      this.localPlayer.showChatBubble(line, true, 4400);
      this.sfx.playMo();
      this.speakVietnameseChant(line);
      this.propsManager.triggerHaloPulse(6);
      if (!this.isSoloOfflineMode) {
        this.netClient.sendChant(line);
      }
    };

    readLine();
    this.sutraReadingInterval = window.setInterval(readLine, 5400);
  }

  private handleStopSutraReading(): void {
    if (this.sutraReadingInterval) {
      clearInterval(this.sutraReadingInterval);
      this.sutraReadingInterval = undefined;
    }
    this.chantVoiceAudio.pause();
    this.hud.setSutraReadingState(false);
  }

  private rebuildLocalPlayerAppearance(name: string, robeColor: RobeColor): void {
    const oldPos = this.localPlayer.root.position.clone();
    const oldRot = this.localPlayer.root.rotation.y;
    const oldAction = this.localPlayer.action;
    const savedExp = this.localPlayer.exp;
    const savedLevel = this.localPlayer.level;

    if (this.localPlayer.robeColor !== robeColor) {
      this.scene.remove(this.localPlayer.root);
      this.localPlayer.dispose();
      this.localPlayer = createCharacter('local', name, robeColor);
      this.localPlayer.setLevelAndExp(savedLevel, savedExp, this.religionMode);
      this.localPlayer.root.position.copy(oldPos);
      this.localPlayer.root.rotation.y = oldRot;
      this.localPlayer.action = oldAction;
      this.scene.add(this.localPlayer.root);
      this.movementController = new PlayerMovementController(this.localPlayer, this.scene);
    } else {
      this.localPlayer.setReligionMode(this.religionMode);
      this.localPlayer.updateNameTag(name);
    }
  }

  private startSoloMode(playerName: string, robeColor: RobeColor): void {
    this.isSoloOfflineMode = true;
    this.rebuildLocalPlayerAppearance(playerName, robeColor);
    this.hud.show();
    this.chatUI.show();
    const isCath = this.religionMode === 'catholic';
    const soloTitle = isCath
      ? 'Piano Thánh Ca Không Lời - Nhạc Cầu Nguyện Tĩnh Tâm Trong Nhà Thờ'
      : 'Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng';
    this.hud.updateRoomHeader({
      roomName: isCath
        ? 'Thánh Đường Nhà Thờ (Đi dạo một mình)'
        : 'Chánh Điện Chùa (Đi dạo một mình)',
      roomCode: '',
      playerCount: 1,
      maxCapacity: 1,
      nowPlayingTitle: soloTitle
    });
    this.radio.syncWithServer({
      trackId: isCath ? 'catholic_hymn_1' : 'yt_Qq6dBbRusdw',
      trackTitle: soloTitle,
      trackUrl: isCath ? '/audio/yt_0gurLbd6CvM.mp3' : '/audio/yt_Qq6dBbRusdw.mp3',
      trackDuration: 600,
      startTime: Date.now(),
      serverNow: Date.now()
    });
  }

  private async handleLeaveRoomToLobby(): Promise<void> {
    this.handleStopSutraReading();
    this.isSoloOfflineMode = false;
    this.radio.stop();
    await this.netClient.leaveTempleRoom();

    for (const remote of this.remotePlayers.values()) {
      this.scene.remove(remote.root);
      remote.dispose();
    }
    this.remotePlayers.clear();

    this.hud.hide();
    this.chatUI.hide();
    this.lobbyUI.show(true);
    await this.netClient.connectLobby();
  }

  private handleTogglePray(): void {
    if (this.movementController.isPrayingForIncense) return;
    this.movementController.cancelNavigation();

    if (this.localPlayer.action === 'bow') {
      this.netClient.stopBow();
    }

    const nextAction: PlayerAction = this.localPlayer.action === 'pray' ? 'idle' : 'pray';
    this.localPlayer.action = nextAction;
    if (nextAction === 'pray') {
      this.localPlayer.animTime = 0;
    }
    this.hud.updateActionButtonsState(nextAction);
    this.netClient.sendSetAction(nextAction);
  }

  private handleToggleBow(preferredCushionIndex?: number): void {
    if (this.movementController.isPrayingForIncense) return;
    this.handleStopSutraReading();

    if (this.localPlayer.action === 'bow') {
      this.localPlayer.action = 'idle';
      this.hud.updateActionButtonsState('idle');
      this.netClient.stopBow();
      return;
    }

    if (this.isSoloOfflineMode) {
      let bestSpot = CUSHION_POSITIONS[0];
      let minDist = Infinity;
      for (const spot of CUSHION_POSITIONS) {
        const d = Math.hypot(
          spot.x - this.localPlayer.root.position.x,
          spot.z - this.localPlayer.root.position.z
        );
        if (d < minDist) {
          minDist = d;
          bestSpot = spot;
        }
      }
      this.movementController.navigateToPoint(bestSpot.x, bestSpot.z, 0, () => {
        this.localPlayer.action = 'bow';
        this.localPlayer.animTime = 0;
        this.hud.updateActionButtonsState('bow');
        this.propsManager.triggerHaloPulse(12);
      });
      return;
    }

    this.netClient.requestBow(preferredCushionIndex);
  }

  private handleToggleBeads(open: boolean): void {
    if (this.movementController.isPrayingForIncense) return;
    this.movementController.cancelNavigation();

    if (this.localPlayer.action === 'bow') {
      this.netClient.stopBow();
    }

    const nextAction: PlayerAction = open ? 'beads' : 'idle';
    this.localPlayer.action = nextAction;
    this.hud.updateActionButtonsState(nextAction);
    this.netClient.sendSetAction(nextAction);
  }

  /**
   * Đốt nhang: đi tới lư hương -> chắp tay 2 giây + niệm "Nam Mô A Di Đà Phật" + bật hào quang Phật -> cắm nhang
   */
  private handleOfferIncenseSequence(): void {
    if (this.movementController.isPrayingForIncense) return;
    this.handleStopSutraReading();

    if (this.localPlayer.action === 'bow') {
      this.netClient.stopBow();
    }

    const standX = INCENSE_STAND_POS.x + (Math.random() - 0.5) * 0.5;
    const standZ = INCENSE_STAND_POS.z;

    this.hud.showToast(
      this.religionMode === 'catholic'
        ? 'Đang tiến tới Giàn Nến Cầu Nguyện trước Cung Thánh...'
        : 'Đang tiến tới trước lư hương đồng...'
    );
    this.movementController.navigateToPoint(standX, standZ, 0, () => {
      this.movementController.isPrayingForIncense = true;
      this.localPlayer.action = 'pray';
      this.localPlayer.handIncenseMesh.visible = true;
      this.hud.updateActionButtonsState('pray');

      const chantText =
        this.religionMode === 'catholic'
          ? '✝️ Lạy Chúa, xin nhận lời con cầu nguyện ✝️'
          : '🙏 Nam Mô A Di Đà Phật 🙏';
      this.localPlayer.showChatBubble(chantText, true, 6500);
      this.speakVietnameseChant(
        this.religionMode === 'catholic'
          ? 'Lạy Chúa, xin nhận lời con cầu nguyện'
          : 'Nam Mô A Di Đà Phật'
      );
      this.activeProps.triggerHaloPulse(14);

      this.netClient.sendMove(
        this.localPlayer.root.position.x,
        this.localPlayer.root.position.z,
        0,
        'pray'
      );

      window.setTimeout(() => {
        this.movementController.isPrayingForIncense = false;
        this.localPlayer.handIncenseMesh.visible = false;
        this.localPlayer.action = 'idle';
        this.hud.updateActionButtonsState('idle');
        this.netClient.sendSetAction('idle');

        if (this.isSoloOfflineMode) {
          this.plantSoloIncense();
        } else {
          this.netClient.plantIncense();
        }
      }, INCENSE_PRAY_DURATION_MS);
    });
  }

  private plantSoloIncense(): void {
    const now = Date.now();
    this.soloIncenseSticks = this.soloIncenseSticks.filter((s) => s.expiresAt > now);
    if (this.soloIncenseSticks.length >= MAX_INCENSE_PER_PLAYER) {
      this.hud.showToast(`Mỗi người chỉ được dâng tối đa ${MAX_INCENSE_PER_PLAYER} nén nhang cùng lúc`);
      return;
    }
    if (this.soloIncenseSticks.length >= MAX_INCENSE_IN_BURNER) {
      this.soloIncenseSticks.shift();
    }
    this.soloIncenseSticks.push({
      id: `solo_inc_${now}`,
      ownerId: 'local',
      ownerName: this.localPlayer.name,
      slotIndex: this.soloIncenseSticks.length,
      expiresAt: now + INCENSE_BURN_DURATION_MS
    });
    this.propsManager.syncIncenseSticks(this.soloIncenseSticks);
    this.sfx.playBell();
    this.propsManager.triggerHaloPulse(15);
    this.hud.showToast('🙏 Nam Mô A Di Đà Phật — Đã dâng 1 nén tâm hương lên lư đồng');
  }

  private bindScenePointerInteractions(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activeProps.incensePickables.length === 0) {
        this.hud.showIncenseTooltip(null);
        return;
      }

      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.activeProps.incensePickables, false);

      if (hits.length > 0 && hits[0].object.userData.incenseInfo) {
        const info = hits[0].object.userData.incenseInfo as SyncedIncenseData;
        this.hud.showIncenseTooltip(info, e.clientX, e.clientY);
        dom.style.cursor = 'pointer';
      } else {
        this.hud.showIncenseTooltip(null);
        dom.style.cursor = 'default';
      }
    });

    dom.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (this.cameraController.wasDragGesture) return;
      if (!this.isSoloOfflineMode && !this.netClient.isInTempleRoom()) return;

      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);

      // 0. Chạm vào nén nhang / nến đang cháy trên điện thoại -> hiện tên người dâng & thời gian còn lại
      if (this.activeProps.incensePickables.length > 0) {
        const stickHits = this.raycaster.intersectObjects(this.activeProps.incensePickables, false);
        if (stickHits.length > 0 && stickHits[0].object.userData.incenseInfo) {
          const info = stickHits[0].object.userData.incenseInfo as SyncedIncenseData;
          this.hud.showIncenseTooltip(info, e.clientX, e.clientY);
          if (e.pointerType === 'touch') {
            window.setTimeout(() => this.hud.showIncenseTooltip(null), 3200);
          }
          return;
        }
      }

      // 1. Click vào Lư hương đồng / Giàn nến -> tự đi tới dâng nhang / thắp nến
      const burnerHits = this.raycaster.intersectObject(this.activeProps.burnerMesh, true);
      if (burnerHits.length > 0) {
        this.hud.closeBeadsIfOpen();
        this.hud.closeSutraIfOpen();
        this.handleOfferIncenseSequence();
        return;
      }

      // 2. Click vào Chuông chùa / Tháp chuông nhà thờ -> thỉnh chuông
      const bellHits = this.raycaster.intersectObject(this.activeProps.bellMesh, true);
      if (bellHits.length > 0) {
        this.sfx.playBell();
        this.hud.showToast(
          this.religionMode === 'catholic'
            ? '🔔 Tiếng Chuông Thánh Đường ngân vang...'
            : '🔔 Tiếng Đại Hồng Chung ngân vang...'
        );
        return;
      }

      // 2b. Click vào Ống Xăm / Hộp Lời Chúa trên bàn thờ
      const fortuneHits = this.raycaster.intersectObject(this.activeProps.fortuneCylinderMesh, true);
      if (fortuneHits.length > 0) {
        this.hud.openFortuneModal();
        return;
      }

      // 2d. Click vào bất kỳ Đài Tượng Chúa, Đức Mẹ, Các Thánh hoặc Tượng Chư Phật, Bồ Tát -> tự đi tới trước Đài Tượng và Cầu Nguyện / Lễ Lạy
      if (this.activeProps.shrineTargets && this.activeProps.shrineTargets.length > 0) {
        for (const shrine of this.activeProps.shrineTargets) {
          const hits = this.raycaster.intersectObject(shrine.mesh, true);
          if (hits.length > 0) {
            this.hud.closeBeadsIfOpen();
            this.hud.closeSutraIfOpen();
            if (this.localPlayer.action === 'bow') {
              this.netClient.stopBow();
            }
            this.hud.showToast(`🙏 Đang tiến tới lễ nguyện trước ${shrine.name}...`);
            this.movementController.navigateToPoint(
              shrine.standX,
              shrine.standZ,
              shrine.faceRotationY,
              () => {
                this.localPlayer.action = 'pray';
                this.localPlayer.animTime = 0;
                this.hud.updateActionButtonsState('pray');
                this.netClient.sendSetAction('pray');
                this.localPlayer.showChatBubble(shrine.prayerText, true, 6500);
                this.speakVietnameseChant(shrine.speechText);
                this.activeProps.triggerHaloPulse(12);
                this.sfx.playBell();
                if (!this.isSoloOfflineMode) {
                  this.netClient.sendChant(shrine.prayerText);
                }
                this.awardLocalAndServerExp(20, `Cầu nguyện trước ${shrine.name}`);
              }
            );
            return;
          }
        }
      }

      // 2c. Click vào Cây Bồ Đề / Cây Phước Lành ngoài sân
      const treeHits = this.raycaster.intersectObject(this.activeProps.bodhiTreeMesh, true);
      if (treeHits.length > 0) {
        this.hud.openWishModal();
        return;
      }

      // 3. Click vào Bồ đoàn / Ghế quỳ -> đi tới đó và Lạy / Quỳ cầu nguyện
      const cushionHits = this.raycaster.intersectObjects(this.activeProps.cushionMeshes, false);
      if (cushionHits.length > 0) {
        const idx = cushionHits[0].object.userData.cushionIndex;
        if (typeof idx === 'number') {
          this.hud.closeBeadsIfOpen();
          this.hud.closeSutraIfOpen();
          this.handleToggleBow(idx);
          return;
        }
      }

      // 4. Click vào sàn -> đi bộ tới điểm đó
      const floorHits = this.raycaster.intersectObjects(this.activeEnv.floorMeshes, false);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        this.hud.closeBeadsIfOpen();
        this.hud.closeSutraIfOpen();
        if (this.localPlayer.action === 'bow') {
          this.netClient.stopBow();
        }
        this.hud.updateActionButtonsState('walk');
        this.movementController.navigateToPoint(pt.x, pt.z, undefined, () => {
          this.localPlayer.action = 'idle';
          this.hud.updateActionButtonsState('idle');
        });
      }
    });
  }

  private syncPlayersFromServer(
    playersMap: Map<string, RemotePlayerState>,
    mySessionId: string
  ): void {
    let connectedCount = 0;
    const lbEntries: LeaderboardEntry[] = [];

    playersMap.forEach((pState) => {
      if (pState.connected) {
        connectedCount++;
        lbEntries.push({
          id: pState.id,
          name: pState.name,
          level: pState.level || 1,
          exp: pState.exp || 0,
          isMe: pState.id === mySessionId
        });
      }

      if (pState.id === mySessionId) {
        if (this.remotePlayers.has(mySessionId)) {
          const selfGhost = this.remotePlayers.get(mySessionId)!;
          this.scene.remove(selfGhost.root);
          selfGhost.dispose();
          this.remotePlayers.delete(mySessionId);
        }
        this.localPlayer.setLevelAndExp(pState.level || 1, pState.exp || 0, this.religionMode);
        this.localPlayer.updateNameTag(pState.name);
        this.hud.updateLevelProgress(pState.level || 1, pState.exp || 0);
        return;
      }

      let remote = this.remotePlayers.get(pState.id);
      if (!remote) {
        remote = createCharacter(pState.id, pState.name, pState.robeColor);
        remote.setLevelAndExp(pState.level || 1, pState.exp || 0, this.religionMode);
        remote.root.position.set(pState.x, 0, pState.z);
        remote.root.rotation.y = pState.rotation;
        remote.targetX = pState.x;
        remote.targetZ = pState.z;
        remote.targetRotation = pState.rotation;
        this.scene.add(remote.root);
        this.remotePlayers.set(pState.id, remote);
      } else {
        remote.setLevelAndExp(pState.level || 1, pState.exp || 0, this.religionMode);
        remote.updateNameTag(pState.name);
        remote.targetX = pState.x;
        remote.targetZ = pState.z;
        remote.targetRotation = pState.rotation;
        if (
          remote.action !== pState.action &&
          (pState.action === 'pray' || pState.action === 'bow')
        ) {
          remote.animTime = 0;
        }
        remote.action = pState.action;
        remote.connected = pState.connected;
        remote.disconnectedAt = pState.disconnectedAt;
      }
    });

    for (const [id, remote] of this.remotePlayers.entries()) {
      if (!playersMap.has(id)) {
        this.scene.remove(remote.root);
        remote.dispose();
        this.remotePlayers.delete(id);
      }
    }

    this.hud.updateLeaderboard(lbEntries);
    this.hud.updateRoomHeader({
      playerCount: Math.max(1, connectedCount),
      maxCapacity: this.currentRoomCapacity
    });
  }

  private bindResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.1, this.clock.getDelta());
    const elapsedSeconds = this.clock.elapsedTime;
    const nowMs = Date.now();

    if (this.isSoloOfflineMode || this.netClient.isInTempleRoom()) {
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const camYaw = Math.atan2(-camDir.x, -camDir.z);

      this.movementController.update(dt, nowMs, camYaw, (x, z, rot, action) => {
        if (!this.isSoloOfflineMode) {
          this.netClient.sendMove(x, z, rot, action);
        }
      });
    }

    updateCharacterAnimation(this.localPlayer, dt, () => {
      this.sfx.playMo();
    });
    this.localPlayer.updateVisibilityByDistance(this.camera.position);
    this.localPlayer.updateChatBubble(nowMs);

    let anyoneBowingOrOffering =
      this.localPlayer.action === 'bow' || this.movementController.isPrayingForIncense;

    for (const remote of this.remotePlayers.values()) {
      interpolateRemotePlayer(remote, dt);
      updateCharacterAnimation(remote, dt);
      remote.updateVisibilityByDistance(this.camera.position);
      remote.updateChatBubble(nowMs);

      if (remote.action === 'bow') {
        anyoneBowingOrOffering = true;
      }

      if (!remote.connected && remote.disconnectedAt > 0) {
        const lostMs = nowMs - remote.disconnectedAt;
        const fadeMs = 2000;
        if (lostMs >= fadeMs) {
          remote.root.visible = false;
        } else {
          remote.root.visible = true;
          remote.setOpacity(1 - lostMs / fadeMs);
        }
      } else {
        remote.root.visible = true;
        remote.setOpacity(1);
      }
    }

    // Khi có người đang Lạy hoặc Đốt nhang thì Hào Quang Phật / Cung Thánh bừng sáng rực rỡ
    this.activeProps.setHaloSacredActive(anyoneBowingOrOffering);

    this.cameraController.update(this.localPlayer.root.position);
    this.lighting.update(elapsedSeconds);
    this.activeProps.update(dt, elapsedSeconds);

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new ChuaOnlineApp();
});
