import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

const { width } = Dimensions.get("window");

const BOARD_SIZE = Math.min(width - 40, 360);
const CELL_SIZE = (BOARD_SIZE - 28) / 3;

type Player = "X" | "O";
type Cell = Player | null;
type Screen = "splash" | "menu" | "choice" | "game" | "settings";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// =====================================================
// WINNER CHECK
// =====================================================

function getWinner(board: Cell[]) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;

    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return {
        winner: board[a] as Player,
        line,
      };
    }
  }

  if (board.every((cell) => cell !== null)) {
    return {
      winner: "DRAW" as const,
      line: [] as number[],
    };
  }

  return null;
}

// =====================================================
// X / O ANIMATION
// =====================================================

function GameSymbol({ value }: { value: Player | null }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value) {
      scale.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),

        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);

  if (!value) return null;

  return (
    <Animated.Text
      style={[
        styles.symbol,
        value === "X" ? styles.xSymbol : styles.oSymbol,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

// =====================================================
// BOARD CELL
// =====================================================

function BoardCell({
  value,
  onPress,
  isWinning,
}: {
  value: Cell;
  onPress: () => void;
  isWinning: boolean;
}) {
  const winningScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isWinning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(winningScale, {
            toValue: 1.08,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(winningScale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      winningScale.stopAnimation();
      winningScale.setValue(1);
    }

    return () => {
      winningScale.stopAnimation();
    };
  }, [isWinning]);

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ scale: winningScale }],
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={value !== null}
        android_ripple={{
          color: "#2563EB",
        }}
        style={({ pressed }) => [
          styles.cell,
          pressed && value === null && styles.cellPressed,
          isWinning && styles.winningCell,
        ]}
      >
        <GameSymbol value={value} />
      </Pressable>
    </Animated.View>
  );
}

// =====================================================
// MAIN SCREEN
// =====================================================

export default function HomeScreen() {
  const [screen, setScreen] =
    useState<Screen>("splash");

  const [selectedPlayer, setSelectedPlayer] =
    useState<Player>("X");

  const [currentPlayer, setCurrentPlayer] =
    useState<Player>("X");

  const [board, setBoard] = useState<Cell[]>(
    Array(9).fill(null)
  );

  const [winner, setWinner] =
    useState<Player | "DRAW" | null>(null);

  const [winningLine, setWinningLine] =
    useState<number[]>([]);

  const [musicOn, setMusicOn] =
    useState(true);

  const [score, setScore] = useState({
    X: 0,
    O: 0,
    DRAW: 0,
  });

  // ===================================================
  // RESULT ANIMATION
  // ===================================================

  const resultScale =
    useRef(new Animated.Value(0)).current;

  const resultOpacity =
    useRef(new Animated.Value(0)).current;

  // ===================================================
  // AUDIO
  // ===================================================

  const menuMusic = useAudioPlayer(
    require("../../assets/audio/menu.mp3")
  );

  const gameMusic = useAudioPlayer(
    require("../../assets/audio/game.mp3")
  );

  const clickSound = useAudioPlayer(
    require("../../assets/audio/click.mp3")
  );

  const moveSound = useAudioPlayer(
    require("../../assets/audio/move.mp3")
  );

  const winSound = useAudioPlayer(
    require("../../assets/audio/win.mp3")
  );

  const drawSound = useAudioPlayer(
    require("../../assets/audio/draw.mp3")
  );

  // ===================================================
  // AUDIO MODE
  // ===================================================

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  // ===================================================
  // SPLASH
  // ===================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setScreen("menu");
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // ===================================================
  // BACKGROUND MUSIC
  // ===================================================

  useEffect(() => {
    try {
      menuMusic.pause();
      gameMusic.pause();

      if (!musicOn) {
        return;
      }

      if (screen === "menu") {
        menuMusic.loop = true;
        menuMusic.volume = 0.35;
        menuMusic.play();
      }

      if (screen === "game") {
        gameMusic.loop = true;
        gameMusic.volume = 0.40;
        gameMusic.play();
      }
    } catch (error) {
      console.log("Music error:", error);
    }
  }, [screen, musicOn]);

  // ===================================================
  // SOUND
  // ===================================================

  const playSound = (player: any) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.log("Sound error:", error);
    }
  };

  // ===================================================
  // RESULT ANIMATION
  // ===================================================

  const animateResult = () => {
    resultScale.setValue(0);
    resultOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),

      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ===================================================
  // START GAME
  // ===================================================

  const startGame = () => {
    playSound(clickSound);
    setScreen("choice");
  };

  // ===================================================
  // SELECT PLAYER
  // ===================================================

  const selectPlayer = (player: Player) => {
    playSound(clickSound);

    setSelectedPlayer(player);
    setCurrentPlayer(player);

    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine([]);

    resultScale.setValue(0);
    resultOpacity.setValue(0);

    setScreen("game");
  };

  // ===================================================
  // MAKE MOVE
  // ===================================================

  const makeMove = (index: number) => {
    if (board[index] !== null) return;
    if (winner !== null) return;

    const newBoard = [...board];

    newBoard[index] = currentPlayer;

    setBoard(newBoard);

    playSound(moveSound);

    const result = getWinner(newBoard);

    if (result) {
      animateResult();

      if (result.winner === "DRAW") {
        setWinner("DRAW");
        setWinningLine([]);

        setScore((prev) => ({
          ...prev,
          DRAW: prev.DRAW + 1,
        }));

        playSound(drawSound);
      } else {
        setWinner(result.winner);
        setWinningLine(result.line);

        setScore((prev) => ({
          ...prev,
          [result.winner]:
            prev[result.winner] + 1,
        }));

        playSound(winSound);
      }

      return;
    }

    setCurrentPlayer(
      currentPlayer === "X" ? "O" : "X"
    );
  };

  // ===================================================
  // PLAY AGAIN
  // ===================================================

  const playAgain = () => {
    playSound(clickSound);

    resultScale.setValue(0);
    resultOpacity.setValue(0);

    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine([]);
    setCurrentPlayer(selectedPlayer);
  };

  // ===================================================
  // GO TO MENU
  // ===================================================

  const goToMenu = () => {
    playSound(clickSound);

    resultScale.setValue(0);
    resultOpacity.setValue(0);

    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine([]);

    setScreen("menu");
  };

  // ===================================================
  // RESET SCORE
  // ===================================================

  const resetScore = () => {
    Alert.alert(
      "Reset Score",
      "Are you sure you want to reset the score?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setScore({
              X: 0,
              O: 0,
              DRAW: 0,
            });

            playSound(clickSound);
          },
        },
      ]
    );
  };

  // ===================================================
  // MUSIC TOGGLE
  // ===================================================

  const toggleMusic = () => {
    playSound(clickSound);
    setMusicOn((value) => !value);
  };

  // ===================================================
  // SPLASH SCREEN
  // ===================================================

  if (screen === "splash") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#050816"
        />

        <View style={styles.splashContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoX}>
              X
            </Text>

            <Text style={styles.logoO}>
              O
            </Text>
          </View>

          <Text style={styles.gameTitle}>
            TIC-TAC-TOE
          </Text>

          <Text style={styles.powered}>
            BY
          </Text>

          <Text style={styles.prasad}>
            PRASAD MUNDHE
          </Text>

          <View style={styles.loadingBar}>
            <View
              style={styles.loadingProgress}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // MENU
  // ===================================================

  if (screen === "menu") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#050816"
        />

        <View style={styles.menuContainer}>
          <View style={styles.topBrand}>
            <Text style={styles.smallBrand}>
              PRASAD MUNDHE
            </Text>
          </View>

          <View style={styles.menuLogo}>
            <Text style={styles.menuX}>
              X
            </Text>

            <Text style={styles.menuVs}>
              VS
            </Text>

            <Text style={styles.menuO}>
              O
            </Text>
          </View>

          <Text style={styles.menuTitle}>
            TIC-TAC-TOE
          </Text>

          <Text style={styles.menuSubtitle}>
            CLASSIC • PREMIUM • LOCAL
          </Text>

          <View style={styles.menuButtons}>
            <Pressable
              onPress={startGame}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={styles.primaryButtonText}
              >
                PLAY GAME
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                playSound(clickSound);
                setScreen("settings");
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                ⚙  SETTINGS
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            2 PLAYER • OFFLINE
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // CHOICE
  // ===================================================

  if (screen === "choice") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#050816"
        />

        <View style={styles.choiceContainer}>
          <Pressable
            onPress={() => {
              playSound(clickSound);
              setScreen("menu");
            }}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹  BACK
            </Text>
          </Pressable>

          <Text style={styles.choiceTitle}>
            CHOOSE YOUR
          </Text>

          <Text
            style={styles.choiceTitleAccent}
          >
            SYMBOL
          </Text>

          <Text
            style={styles.choiceSubtitle}
          >
            Your selected symbol gets the
            first turn.
          </Text>

          <View style={styles.symbolChoiceRow}>
            <Pressable
              onPress={() =>
                selectPlayer("X")
              }
              style={({ pressed }) => [
                styles.symbolChoice,
                selectedPlayer === "X" &&
                  styles.selectedChoice,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text style={styles.bigX}>
                X
              </Text>

              <Text style={styles.choiceLabel}>
                PLAYER X
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                selectPlayer("O")
              }
              style={({ pressed }) => [
                styles.symbolChoice,
                selectedPlayer === "O" &&
                  styles.selectedChoiceO,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text style={styles.bigO}>
                O
              </Text>

              <Text style={styles.choiceLabel}>
                PLAYER O
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // SETTINGS
  // ===================================================

  if (screen === "settings") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#050816"
        />

        <View style={styles.settingsContainer}>
          <Pressable
            onPress={() => {
              playSound(clickSound);
              setScreen("menu");
            }}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹  BACK
            </Text>
          </Pressable>

          <Text style={styles.settingsTitle}>
            SETTINGS
          </Text>

          <View style={styles.settingCard}>
            <View>
              <Text
                style={styles.settingTitle}
              >
                BACKGROUND MUSIC
              </Text>

              <Text
                style={styles.settingSubtitle}
              >
                Menu & gameplay music
              </Text>
            </View>

            <Pressable
              onPress={toggleMusic}
              style={[
                styles.toggle,
                musicOn
                  ? styles.toggleOn
                  : styles.toggleOff,
              ]}
            >
              <View
                style={[
                  styles.toggleCircle,
                  musicOn &&
                    styles.toggleCircleOn,
                ]}
              />

              <Text style={styles.toggleText}>
                {musicOn ? "ON" : "OFF"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={resetScore}
            style={styles.resetButton}
          >
            <Text style={styles.resetText}>
              RESET SCORE
            </Text>
          </Pressable>

          <View style={styles.aboutBox}>
            <Text style={styles.aboutTitle}>
              TIC-TAC-TOE
            </Text>

            <Text style={styles.aboutText}>
              Created by Prasad Mundhe
            </Text>

            <Text style={styles.aboutText}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // GAME SCREEN
  // ===================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#050816"
      />

      <View style={styles.gameContainer}>
        {/* GAME HEADER */}

        <View style={styles.gameHeader}>
          <Pressable
            onPress={goToMenu}
            style={styles.headerBack}
          >
            <Text
              style={styles.headerBackText}
            >
              ‹
            </Text>
          </Pressable>

          <View>
            <Text
              style={styles.gameHeaderTitle}
            >
              TIC-TAC-TOE
            </Text>

            <Text style={styles.turnText}>
              {winner
                ? "GAME OVER"
                : `PLAYER ${currentPlayer}'S TURN`}
            </Text>
          </View>

          <Pressable
            onPress={toggleMusic}
            style={styles.musicButton}
          >
            <Text style={styles.musicIcon}>
              {musicOn ? "♫" : "🔇"}
            </Text>
          </Pressable>
        </View>

        {/* SCORE */}

        <View style={styles.scoreRow}>
          <View
            style={[
              styles.scoreBox,
              currentPlayer === "X" &&
                !winner &&
                styles.activeScore,
            ]}
          >
            <Text
              style={styles.scoreSymbolX}
            >
              X
            </Text>

            <Text style={styles.scoreNumber}>
              {score.X}
            </Text>
          </View>

          <View style={styles.drawBox}>
            <Text style={styles.drawLabel}>
              DRAW
            </Text>

            <Text style={styles.scoreNumber}>
              {score.DRAW}
            </Text>
          </View>

          <View
            style={[
              styles.scoreBox,
              currentPlayer === "O" &&
                !winner &&
                styles.activeScoreO,
            ]}
          >
            <Text
              style={styles.scoreSymbolO}
            >
              O
            </Text>

            <Text style={styles.scoreNumber}>
              {score.O}
            </Text>
          </View>
        </View>

        {/* PROFESSIONAL BOARD */}

        <View style={styles.board}>
          {[0, 1, 2].map((row) => (
            <View
              key={row}
              style={styles.boardRow}
            >
              {[0, 1, 2].map((column) => {
                const index =
                  row * 3 + column;

                return (
                  <BoardCell
                    key={index}
                    value={board[index]}
                    isWinning={winningLine.includes(
                      index
                    )}
                    onPress={() =>
                      makeMove(index)
                    }
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* RESULT */}

        {winner && (
          <Animated.View
            style={[
              styles.resultBox,
              {
                opacity: resultOpacity,
                transform: [
                  {
                    scale: resultScale,
                  },
                ],
              },
            ]}
          >
            {winner === "DRAW" ? (
              <>
                <Text
                  style={styles.resultEmoji}
                >
                  🤝
                </Text>

                <Text
                  style={styles.resultTitle}
                >
                  DRAW GAME
                </Text>

                <Text
                  style={styles.resultSubtitle}
                >
                  Nobody wins this round.
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={styles.resultEmoji}
                >
                  🏆
                </Text>

                <Text
                  style={styles.resultTitle}
                >
                  PLAYER {winner} WINS!
                </Text>

                <Text
                  style={styles.resultSubtitle}
                >
                  Congratulations!
                </Text>
              </>
            )}

            <View
              style={styles.resultButtons}
            >
              <Pressable
                onPress={playAgain}
                style={styles.playAgainButton}
              >
                <Text
                  style={styles.playAgainText}
                >
                  PLAY AGAIN
                </Text>
              </Pressable>

              <Pressable
                onPress={goToMenu}
                style={styles.menuButtonSmall}
              >
                <Text
                  style={
                    styles.menuButtonSmallText
                  }
                >
                  MENU
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {!winner && (
          <Text style={styles.instruction}>
            TAP A CELL TO MAKE YOUR MOVE
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },

  // ===================================================
  // SPLASH
  // ===================================================

  splashContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: "#334155",
    backgroundColor: "#0B1224",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  logoX: {
    fontSize: 48,
    fontWeight: "900",
    color: "#38BDF8",
    marginRight: 5,
  },

  logoO: {
    fontSize: 48,
    fontWeight: "900",
    color: "#A78BFA",
    marginLeft: 5,
  },

  gameTitle: {
    marginTop: 28,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#FFFFFF",
  },

  powered: {
    marginTop: 30,
    fontSize: 11,
    letterSpacing: 4,
    color: "#64748B",
  },

  prasad: {
    marginTop: 7,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#38BDF8",
  },

  loadingBar: {
    width: 180,
    height: 4,
    marginTop: 35,
    borderRadius: 5,
    backgroundColor: "#182235",
    overflow: "hidden",
  },

  loadingProgress: {
    width: "70%",
    height: "100%",
    backgroundColor: "#38BDF8",
  },

  // ===================================================
  // MENU
  // ===================================================

  menuContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 22,
  },

  topBrand: {
    marginTop: 20,
  },

  smallBrand: {
    color: "#64748B",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
  },

  menuLogo: {
    marginTop: 70,
    flexDirection: "row",
    alignItems: "center",
  },

  menuX: {
    color: "#38BDF8",
    fontSize: 74,
    fontWeight: "900",
  },

  menuVs: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "800",
    marginHorizontal: 16,
  },

  menuO: {
    color: "#A78BFA",
    fontSize: 74,
    fontWeight: "900",
  },

  menuTitle: {
    marginTop: 25,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 3,
  },

  menuSubtitle: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 11,
    letterSpacing: 2,
  },

  menuButtons: {
    width: "100%",
    marginTop: 65,
  },

  primaryButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },

  secondaryButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#0D1528",
    borderWidth: 1,
    borderColor: "#263650",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },

  buttonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.98 }],
  },

  footer: {
    position: "absolute",
    bottom: 25,
    color: "#475569",
    fontSize: 10,
    letterSpacing: 2,
  },

  // ===================================================
  // CHOICE
  // ===================================================

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },

  backText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },

  choiceContainer: {
    flex: 1,
    padding: 24,
  },

  choiceTitle: {
    marginTop: 55,
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 2,
  },

  choiceTitleAccent: {
    color: "#38BDF8",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 2,
  },

  choiceSubtitle: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 13,
  },

  symbolChoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 55,
  },

  symbolChoice: {
    width: "47%",
    height: 190,
    borderRadius: 24,
    backgroundColor: "#0B1224",
    borderWidth: 1,
    borderColor: "#24324C",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedChoice: {
    borderColor: "#38BDF8",
    borderWidth: 2,
    backgroundColor: "#0C1C32",
  },

  selectedChoiceO: {
    borderColor: "#A78BFA",
    borderWidth: 2,
    backgroundColor: "#17132E",
  },

  bigX: {
    color: "#38BDF8",
    fontSize: 80,
    fontWeight: "900",
  },

  bigO: {
    color: "#A78BFA",
    fontSize: 80,
    fontWeight: "900",
  },

  choiceLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 10,
  },

  // ===================================================
  // SETTINGS
  // ===================================================

  settingsContainer: {
    flex: 1,
    padding: 24,
  },

  settingsTitle: {
    marginTop: 40,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
  },

  settingCard: {
    marginTop: 45,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#0B1224",
    borderWidth: 1,
    borderColor: "#22314A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  settingSubtitle: {
    marginTop: 7,
    color: "#64748B",
    fontSize: 11,
  },

  toggle: {
    width: 75,
    height: 38,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    justifyContent: "space-between",
  },

  toggleOn: {
    backgroundColor: "#2563EB",
  },

  toggleOff: {
    backgroundColor: "#1E293B",
  },

  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#64748B",
  },

  toggleCircleOn: {
    backgroundColor: "#FFFFFF",
  },

  toggleText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    marginRight: 5,
  },

  resetButton: {
    marginTop: 20,
    height: 55,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#3F2430",
    backgroundColor: "#180F18",
    alignItems: "center",
    justifyContent: "center",
  },

  resetText: {
    color: "#FB7185",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },

  aboutBox: {
    marginTop: 60,
    alignItems: "center",
  },

  aboutTitle: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },

  aboutText: {
    color: "#475569",
    fontSize: 12,
    marginTop: 7,
  },

  // ===================================================
  // GAME HEADER
  // ===================================================

  gameContainer: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: "center",
  },

  gameHeader: {
    width: "100%",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBack: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0D1528",
    alignItems: "center",
    justifyContent: "center",
  },

  headerBackText: {
    color: "#CBD5E1",
    fontSize: 30,
    lineHeight: 32,
  },

  gameHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },

  turnText: {
    marginTop: 4,
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },

  musicButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0D1528",
    alignItems: "center",
    justifyContent: "center",
  },

  musicIcon: {
    color: "#FFFFFF",
    fontSize: 20,
  },

  // ===================================================
  // SCORE
  // ===================================================

  scoreRow: {
    width: BOARD_SIZE,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  scoreBox: {
    width: (BOARD_SIZE - 20) / 3,
    height: 62,
    borderRadius: 16,
    backgroundColor: "#0B1224",
    borderWidth: 1,
    borderColor: "#202D45",
    alignItems: "center",
    justifyContent: "center",
  },

  activeScore: {
    borderColor: "#38BDF8",
    borderWidth: 2,
  },

  activeScoreO: {
    borderColor: "#A78BFA",
    borderWidth: 2,
  },

  drawBox: {
    width: (BOARD_SIZE - 20) / 3,
    height: 62,
    borderRadius: 16,
    backgroundColor: "#0B1224",
    borderWidth: 1,
    borderColor: "#202D45",
    alignItems: "center",
    justifyContent: "center",
  },

  scoreSymbolX: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "900",
  },

  scoreSymbolO: {
    color: "#A78BFA",
    fontSize: 16,
    fontWeight: "900",
  },

  drawLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "900",
  },

  scoreNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },

  // ===================================================
  // PROFESSIONAL 3x3 BOARD
  // ===================================================

  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    marginTop: 18,
    padding: 6,
    borderRadius: 28,
    backgroundColor: "#080F20",
    borderWidth: 2,
    borderColor: "#243653",
    overflow: "hidden",

    shadowColor: "#168CFF",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },

  boardRow: {
    flex: 1,
    flexDirection: "row",
  },

  cell: {
    flex: 1,
    margin: 4,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#21446E",
    backgroundColor: "#0B1528",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },

  cellPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: "#142A48",
    borderColor: "#38BDF8",
    borderWidth: 2,
  },

  winningCell: {
    backgroundColor: "#172B4A",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 18,

    shadowColor: "#A78BFA",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 12,
  },

  symbol: {
    fontSize: CELL_SIZE * 0.55,
    fontWeight: "900",
    textAlign: "center",
  },

  xSymbol: {
    color: "#38BDF8",
    textShadowColor: "#008CFF",
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 12,
  },

  oSymbol: {
    color: "#A78BFA",
    textShadowColor: "#8B4DFF",
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 12,
  },

  // ===================================================
  // RESULT
  // ===================================================

  instruction: {
    marginTop: 15,
    color: "#475569",
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },

  resultBox: {
    width: BOARD_SIZE,
    marginTop: 14,
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#0B1224",
    borderWidth: 1,
    borderColor: "#2B3C5B",
    alignItems: "center",

    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  resultEmoji: {
    fontSize: 25,
  },

  resultTitle: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },

  resultSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },

  resultButtons: {
    width: "100%",
    flexDirection: "row",
    marginTop: 12,
  },

  playAgainButton: {
    flex: 1,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  playAgainText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  menuButtonSmall: {
    flex: 1,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#172033",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  menuButtonSmallText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
});