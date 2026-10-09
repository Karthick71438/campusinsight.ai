import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Zap, CheckCircle2, XCircle, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import GameResultScreen from './GameResultScreen';

// Categories / rules that rotate
const RULES = [
  {
    title: 'Even vs Odd',
    leftLabel: 'EVEN',
    rightLabel: 'ODD',
    testItem: () => {
      const num = Math.floor(Math.random() * 90) + 10;
      return {
        display: num.toString(),
        correctSide: num % 2 === 0 ? 'left' : 'right',
      };
    },
  },
  {
    title: 'Less than 50 vs Greater than 50',
    leftLabel: '< 50',
    rightLabel: '> 50',
    testItem: () => {
      let num = Math.floor(Math.random() * 98) + 1;
      if (num === 50) num = 51;
      return {
        display: num.toString(),
        correctSide: num < 50 ? 'left' : 'right',
      };
    },
  },
  {
    title: 'Vowel vs Consonant',
    leftLabel: 'VOWEL',
    rightLabel: 'CONSONANT',
    testItem: () => {
      const vowels = ['A', 'E', 'I', 'O', 'U'];
      const consonants = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'Z'];
      const isVowel = Math.random() < 0.5;
      const letter = isVowel
        ? vowels[Math.floor(Math.random() * vowels.length)]
        : consonants[Math.floor(Math.random() * consonants.length)];
      return {
        display: letter,
        correctSide: isVowel ? 'left' : 'right',
      };
    },
  },
];

export default function SpeedSortGame({ onComplete, onBackToHub, bestScore }) {
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const activeRule = RULES[currentRuleIndex];

  const GAME_DURATION = 25; // 25 seconds fast challenge
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentItem, setCurrentItem] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const timerRef = useRef(null);

  const startNewGame = () => {
    // Pick random rule
    const ruleIdx = Math.floor(Math.random() * RULES.length);
    setCurrentRuleIndex(ruleIdx);
    setTimeLeft(GAME_DURATION);
    setCorrectCount(0);
    setIncorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setIsFinished(false);

    // Initial item
    setCurrentItem(RULES[ruleIdx].testItem());
  };

  useEffect(() => {
    startNewGame();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (isFinished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isFinished, correctCount, incorrectCount]);

  const handleTimeUp = () => {
    setIsFinished(true);
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const score = Math.round(correctCount * 50 + bestStreak * 25);

    setFinalScore(score);

    if (onComplete) {
      onComplete({
        score,
        accuracy,
        timeSeconds: GAME_DURATION,
        cognitiveMetrics: {
          memory: 'Good',
          attention: accuracy >= 85 ? 'Hyper-Focused' : 'Good',
          reaction: total > 0 ? `${(GAME_DURATION / total).toFixed(2)}s / item` : 'N/A',
        },
      });
    }
  };

  const handleSort = (chosenSide) => {
    if (isFinished || !currentItem) return;

    const isCorrect = chosenSide === currentItem.correctSide;

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback('correct');
    } else {
      setIncorrectCount((w) => w + 1);
      setStreak(0);
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      setCurrentItem(activeRule.testItem());
    }, 120);
  };

  // Keyboard controls (Arrow Left / Arrow Right)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished) return;
      if (e.key === 'ArrowLeft') {
        handleSort('left');
      } else if (e.key === 'ArrowRight') {
        handleSort('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, isFinished, streak, bestStreak]);

  if (isFinished) {
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <GameResultScreen
        gameTitle="Speed Sort"
        score={finalScore}
        bestScore={bestScore}
        isNewBest={!bestScore || finalScore > bestScore}
        accuracy={accuracy}
        timeSeconds={GAME_DURATION}
        cognitiveMetrics={{
          memory: 'Good',
          attention: accuracy >= 85 ? 'High Focus' : 'Good',
          reaction: total > 0 ? `${(GAME_DURATION / total).toFixed(2)}s / item` : 'N/A',
        }}
        onPlayAgain={startNewGame}
        onBackToHub={onBackToHub}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>⚡ Speed Sort</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {activeRule?.title}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Classify as fast as you can before time expires!</p>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Streak</span>
            <span className="font-bold text-emerald-400">🔥 {streak}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Timer</span>
            <span className={`font-bold ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Sorting Arena */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-8 relative overflow-hidden">
        {/* Visual feedback flash */}
        {feedback === 'correct' && (
          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none transition-opacity" />
        )}
        {feedback === 'wrong' && (
          <div className="absolute inset-0 bg-rose-500/10 pointer-events-none transition-opacity" />
        )}

        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
            Current Target
          </span>
          {/* Big Item Display */}
          <div
            className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center text-5xl font-black font-mono transition-transform duration-100 shadow-xl ${
              feedback === 'correct'
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 scale-105'
                : feedback === 'wrong'
                ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-300 scale-95'
                : 'bg-slate-950 border-2 border-slate-800 text-slate-100'
            }`}
          >
            {currentItem?.display || '...'}
          </div>
        </div>

        {/* Action Buttons (Left vs Right) */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-2">
          {/* Left Action */}
          <button
            onClick={() => handleSort('left')}
            className="group py-5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 border-2 border-slate-800 hover:border-teal-500/60 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg"
          >
            <ArrowLeftCircle className="w-6 h-6 text-teal-400 group-hover:-translate-x-1 transition-transform" />
            <span className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
              {activeRule?.leftLabel}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Left Arrow (←)</span>
          </button>

          {/* Right Action */}
          <button
            onClick={() => handleSort('right')}
            className="group py-5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 border-2 border-slate-800 hover:border-violet-500/60 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg"
          >
            <ArrowRightCircle className="w-6 h-6 text-violet-400 group-hover:translate-x-1 transition-transform" />
            <span className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
              {activeRule?.rightLabel}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Right Arrow (→)</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-mono">
          Tip: You can use your keyboard <b>Left Arrow</b> and <b>Right Arrow</b> keys!
        </p>
      </div>
    </div>
  );
}
