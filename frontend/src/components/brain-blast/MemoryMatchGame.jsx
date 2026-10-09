import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Eye, Trophy, ArrowLeft, RefreshCw, Zap } from 'lucide-react';
import GameResultScreen from './GameResultScreen';

const ICONS_POOL = [
  { id: 'zap', icon: '⚡', label: 'Lightning' },
  { id: 'rocket', icon: '🚀', label: 'Rocket' },
  { id: 'gem', icon: '💎', label: 'Gem' },
  { id: 'target', icon: '🎯', label: 'Target' },
  { id: 'crystal', icon: '🔮', label: 'Crystal' },
  { id: 'puzzle', icon: '🧩', label: 'Puzzle' },
  { id: 'fire', icon: '🔥', label: 'Flame' },
  { id: 'atom', icon: '⚛️', label: 'Atom' },
];

export default function MemoryMatchGame({ onComplete, onBackToHub, bestScore }) {
  const [round, setRound] = useState(1);
  const totalRounds = 2;

  // Round 1: 4 pairs (8 cards), Round 2: 6 pairs (12 cards)
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [isMemorizePhase, setIsMemorizePhase] = useState(true);
  const [memorizeCountdown, setMemorizeCountdown] = useState(3);
  const [movesCount, setMovesCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [successfulMatches, setSuccessfulMatches] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAccuracy, setFinalAccuracy] = useState(100);

  const timerRef = useRef(null);

  // Setup round
  const setupRound = (r) => {
    const pairCount = r === 1 ? 4 : 6;
    const selected = ICONS_POOL.slice(0, pairCount);
    const deck = [];
    selected.forEach((item, idx) => {
      deck.push({ uid: `${item.id}-a`, id: item.id, icon: item.icon });
      deck.push({ uid: `${item.id}-b`, id: item.id, icon: item.icon });
    });
    // Shuffle deck
    const shuffled = deck.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedIndices([]);
    setMatchedIds(new Set());
    setIsMemorizePhase(true);
    setMemorizeCountdown(r === 1 ? 3 : 4);
  };

  useEffect(() => {
    setupRound(round);
    setStartTime(Date.now());
  }, [round]);

  // Overall timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isFinished && startTime) {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime, isFinished]);

  // Memorize phase countdown
  useEffect(() => {
    if (!isMemorizePhase) return;
    if (memorizeCountdown <= 0) {
      setIsMemorizePhase(false);
      return;
    }
    const t = setTimeout(() => {
      setMemorizeCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [isMemorizePhase, memorizeCountdown]);

  // Card click handler
  const handleCardClick = (idx) => {
    if (isMemorizePhase) return;
    if (flippedIndices.length >= 2) return;
    if (flippedIndices.includes(idx)) return;
    if (matchedIds.has(cards[idx].id)) return;

    const newFlipped = [...flippedIndices, idx];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMovesCount((m) => m + 1);
      setTotalAttempts((a) => a + 1);

      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];

      if (firstCard.id === secondCard.id) {
        // Match!
        const nextMatched = new Set(matchedIds);
        nextMatched.add(firstCard.id);
        setMatchedIds(nextMatched);
        setSuccessfulMatches((s) => s + 1);
        setFlippedIndices([]);

        // Check if round finished
        const targetPairs = round === 1 ? 4 : 6;
        if (nextMatched.size === targetPairs) {
          if (round < totalRounds) {
            setTimeout(() => {
              setRound((r) => r + 1);
            }, 800);
          } else {
            // Game Finished
            const totalPairs = 4 + 6;
            const timePenalty = Math.max(0, elapsedSeconds * 5);
            const moveBonus = Math.max(100, 1000 - movesCount * 30);
            const computedScore = Math.max(150, Math.round(moveBonus + 500 - timePenalty));
            const computedAcc = Math.round(
              (totalPairs / Math.max(totalPairs, totalAttempts + 1)) * 100
            );

            setFinalScore(computedScore);
            setFinalAccuracy(computedAcc);
            setIsFinished(true);

            if (onComplete) {
              onComplete({
                score: computedScore,
                accuracy: computedAcc,
                timeSeconds: elapsedSeconds,
                cognitiveMetrics: {
                  memory: computedAcc >= 80 ? 'Exceptional' : computedAcc >= 65 ? 'Strong' : 'Good',
                  attention: movesCount <= 16 ? 'Laser-Focused' : 'Good',
                  reaction: `${Math.round(elapsedSeconds / Math.max(1, totalPairs))}s/pair`,
                },
              });
            }
          }
        }
      } else {
        // No match -> flip back after 700ms
        setTimeout(() => {
          setFlippedIndices([]);
        }, 700);
      }
    }
  };

  const handleRestart = () => {
    setIsFinished(false);
    setRound(1);
    setMovesCount(0);
    setTotalAttempts(0);
    setSuccessfulMatches(0);
    setElapsedSeconds(0);
    setStartTime(Date.now());
    setupRound(1);
  };

  if (isFinished) {
    return (
      <GameResultScreen
        gameTitle="Memory Match"
        score={finalScore}
        bestScore={bestScore}
        isNewBest={!bestScore || finalScore > bestScore}
        accuracy={finalAccuracy}
        timeSeconds={elapsedSeconds}
        cognitiveMetrics={{
          memory: finalAccuracy >= 80 ? 'Strong' : 'Good',
          attention: movesCount <= 16 ? 'High Focus' : 'Good',
          reaction: `${Math.round(elapsedSeconds / 10)}s / match`,
        }}
        onPlayAgain={handleRestart}
        onBackToHub={onBackToHub}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Top Controller Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Back to games"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🃏 Memory Match</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                Round {round}/{totalRounds}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isMemorizePhase
                ? `Memorize positions! Cards flip in ${memorizeCountdown}s...`
                : 'Tap cards to reveal and pair them.'}
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block uppercase">Moves</span>
            <span className="font-bold text-teal-400">{movesCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block uppercase">Matches</span>
            <span className="font-bold text-emerald-400">
              {matchedIds.size}/{round === 1 ? 4 : 6}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block uppercase">Time</span>
            <span className="font-bold text-amber-400">{elapsedSeconds}s</span>
          </div>
        </div>
      </div>

      {/* Memorize Countdown Banner */}
      {isMemorizePhase && (
        <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-center gap-2 animate-pulse">
          <Eye className="w-4 h-4 text-teal-400" />
          <span>
            <b>Memorize Phase:</b> Cards will flip face-down in{' '}
            <strong className="font-mono text-sm underline">{memorizeCountdown}s</strong>!
          </span>
        </div>
      )}

      {/* Cards Grid */}
      <div
        className={`grid gap-3 sm:gap-4 ${
          round === 1 ? 'grid-cols-4 max-w-xl mx-auto' : 'grid-cols-4 sm:grid-cols-6'
        }`}
      >
        {cards.map((card, idx) => {
          const isFlipped = isMemorizePhase || flippedIndices.includes(idx) || matchedIds.has(card.id);
          const isMatched = matchedIds.has(card.id);

          return (
            <button
              key={card.uid}
              onClick={() => handleCardClick(idx)}
              disabled={isMemorizePhase || isMatched}
              className={`h-24 sm:h-28 rounded-2xl border-2 flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 transform select-none cursor-pointer ${
                isMatched
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/20 scale-95 opacity-90'
                  : isFlipped
                  ? 'bg-slate-900 border-teal-500/60 shadow-lg shadow-teal-500/20 rotate-0'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:scale-105'
              }`}
            >
              {isFlipped ? (
                <span className="animate-scale-in">{card.icon}</span>
              ) : (
                <span className="text-slate-700 font-mono text-xl font-bold">?</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
