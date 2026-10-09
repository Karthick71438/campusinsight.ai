import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, HelpCircle } from 'lucide-react';
import GameResultScreen from './GameResultScreen';

const PUZZLES = [
  {
    items: ['14', '28', '42', '35', '19'],
    odd: '19',
    reason: '19 is not a multiple of 7 (all others are multiples of 7: 14, 28, 42, 35).',
  },
  {
    items: ['Square', 'Hexagon', 'Triangle', 'Circle'],
    odd: 'Circle',
    reason: 'Circle has no straight edges or corners (all others are polygons).',
  },
  {
    items: ['Python', 'Java', 'C++', 'HTML'],
    odd: 'HTML',
    reason: 'HTML is a markup language, while the others are programming languages.',
  },
  {
    items: ['2', '3', '5', '7', '9'],
    odd: '9',
    reason: '9 is divisible by 3 (composite), while 2, 3, 5, 7 are prime numbers.',
  },
  {
    items: ['North', 'East', 'South', 'Upward'],
    odd: 'Upward',
    reason: 'Upward is vertical; North, East, and South are cardinal map directions.',
  },
  {
    items: ['11', '22', '33', '47', '55'],
    odd: '47',
    reason: '47 has different digits; all others are double repeating digits (11, 22, 33, 55).',
  },
  {
    items: ['A', 'E', 'I', 'O', 'K'],
    odd: 'K',
    reason: 'K is a consonant; A, E, I, O are vowels.',
  },
  {
    items: ['Mercury', 'Mars', 'Jupiter', 'Sun'],
    odd: 'Sun',
    reason: 'The Sun is a star; the others are planets in our solar system.',
  },
  {
    items: ['10', '20', '30', '43', '50'],
    odd: '43',
    reason: '43 does not end in zero (not a multiple of 10).',
  },
];

export default function OddOneOutGame({ onComplete, onBackToHub, bestScore }) {
  const totalRounds = 5;
  const [roundsQueue, setRoundsQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const initializeGame = () => {
    const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, totalRounds);
    // Shuffle items inside each puzzle
    const prepared = shuffled.map((p) => ({
      ...p,
      shuffledItems: [...p.items].sort(() => Math.random() - 0.5),
    }));
    setRoundsQueue(prepared);
    setCurrentIndex(0);
    setSelectedItem(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setIsFinished(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  // Timer
  useEffect(() => {
    if (isFinished || !startTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  const currentPuzzle = roundsQueue[currentIndex];

  const handleSelectItem = (item) => {
    if (isAnswered) return;
    setSelectedItem(item);
    setIsAnswered(true);

    const isCorrect = item === currentPuzzle.odd;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 < totalRounds) {
        setCurrentIndex((i) => i + 1);
        setSelectedItem(null);
        setIsAnswered(false);
      } else {
        const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
        const accuracy = Math.round((finalCorrect / totalRounds) * 100);
        const timeBonus = Math.max(0, 400 - elapsedSeconds * 8);
        const score = Math.round(finalCorrect * 200 + timeBonus);

        setFinalScore(score);
        setIsFinished(true);

        if (onComplete) {
          onComplete({
            score,
            accuracy,
            timeSeconds: elapsedSeconds,
            cognitiveMetrics: {
              memory: 'Good',
              attention: accuracy >= 80 ? 'Sharp Observation' : 'Good',
              reaction: `${(elapsedSeconds / totalRounds).toFixed(1)}s / puzzle`,
            },
          });
        }
      }
    }, 1200);
  };

  if (isFinished) {
    const accuracy = Math.round((correctCount / totalRounds) * 100);
    return (
      <GameResultScreen
        gameTitle="Odd One Out"
        score={finalScore}
        bestScore={bestScore}
        isNewBest={!bestScore || finalScore > bestScore}
        accuracy={accuracy}
        timeSeconds={elapsedSeconds}
        cognitiveMetrics={{
          memory: 'Good',
          attention: accuracy >= 80 ? 'Sharp Observation' : 'Good',
          reaction: `${(elapsedSeconds / totalRounds).toFixed(1)}s / puzzle`,
        }}
        onPlayAgain={initializeGame}
        onBackToHub={onBackToHub}
      />
    );
  }

  if (!currentPuzzle) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
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
              <span>🎯 Odd One Out</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                Puzzle {currentIndex + 1}/{totalRounds}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Spot the item that does not match the rule.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Score</span>
            <span className="font-bold text-teal-400">{correctCount * 200}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Time</span>
            <span className="font-bold text-amber-400">{elapsedSeconds}s</span>
          </div>
        </div>
      </div>

      {/* Puzzle Arena */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-xl text-center space-y-6">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
          Which item does not belong?
        </span>

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto">
          {currentPuzzle.shuffledItems.map((item, idx) => {
            const isSelected = selectedItem === item;
            const isOdd = item === currentPuzzle.odd;

            let cardStyle =
              'bg-slate-950 border-slate-800 text-slate-100 hover:border-violet-500/50 hover:bg-slate-900 hover:scale-105';
            if (isAnswered) {
              if (isOdd) {
                cardStyle =
                  'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-105';
              } else if (isSelected) {
                cardStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
              } else {
                cardStyle = 'bg-slate-950 border-slate-800/40 text-slate-600 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectItem(item)}
                disabled={isAnswered}
                className={`p-5 rounded-2xl border-2 text-base sm:text-lg font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-md ${cardStyle}`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Explanation text */}
        {isAnswered && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold animate-fade-in flex items-center justify-center gap-2 ${
              selectedItem === currentPuzzle.odd
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {selectedItem === currentPuzzle.odd ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{currentPuzzle.reason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
