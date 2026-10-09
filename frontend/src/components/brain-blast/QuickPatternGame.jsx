import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import GameResultScreen from './GameResultScreen';

const PATTERNS_BANK = [
  {
    sequence: ['2', '4', '8', '16', '?'],
    options: ['32', '24', '18', '64'],
    correct: '32',
    explanation: 'Multiply by 2 each step (×2)',
  },
  {
    sequence: ['▲', '●', '▲', '●', '?'],
    options: ['▲', '■', '★', '●'],
    correct: '▲',
    explanation: 'Alternating shapes: triangle, circle, triangle...',
  },
  {
    sequence: ['5', '10', '15', '20', '?'],
    options: ['25', '30', '22', '35'],
    correct: '25',
    explanation: 'Add 5 each step (+5)',
  },
  {
    sequence: ['A', 'C', 'E', 'G', '?'],
    options: ['I', 'H', 'J', 'K'],
    correct: 'I',
    explanation: 'Skip one letter in alphabet (A..C..E..G..I)',
  },
  {
    sequence: ['1', '1', '2', '3', '5', '?'],
    options: ['8', '7', '6', '10'],
    correct: '8',
    explanation: 'Fibonacci: each number is sum of previous two (3 + 5 = 8)',
  },
  {
    sequence: ['100', '90', '80', '70', '?'],
    options: ['60', '50', '65', '55'],
    correct: '60',
    explanation: 'Subtract 10 each step (-10)',
  },
  {
    sequence: ['1', '4', '9', '16', '?'],
    options: ['25', '20', '36', '24'],
    correct: '25',
    explanation: 'Square numbers: 1², 2², 3², 4², 5² = 25',
  },
  {
    sequence: ['🔴', '🔵', '🔴', '🔵', '?'],
    options: ['🔴', '🟢', '🟡', '🔵'],
    correct: '🔴',
    explanation: 'Alternating colors: red, blue, red...',
  },
  {
    sequence: ['3', '6', '12', '24', '?'],
    options: ['48', '36', '42', '30'],
    correct: '48',
    explanation: 'Doubling each number (×2)',
  },
  {
    sequence: ['Z', 'Y', 'X', 'W', '?'],
    options: ['V', 'U', 'T', 'S'],
    correct: 'V',
    explanation: 'Reverse alphabetical order (Z, Y, X, W, V)',
  },
];

export default function QuickPatternGame({ onComplete, onBackToHub, bestScore }) {
  const totalRounds = 5;
  const [roundsQueue, setRoundsQueue] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Initialize random 5 questions
  const initializeGame = () => {
    const shuffled = [...PATTERNS_BANK].sort(() => Math.random() - 0.5).slice(0, totalRounds);
    // Shuffle options for each
    const prepared = shuffled.map((q) => ({
      ...q,
      shuffledOptions: [...q.options].sort(() => Math.random() - 0.5),
    }));
    setRoundsQueue(prepared);
    setCurrentRoundIndex(0);
    setSelectedOption(null);
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

  const currentQuestion = roundsQueue[currentRoundIndex];

  const handleSelectOption = (opt) => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);

    const isCorrect = opt === currentQuestion.correct;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentRoundIndex + 1 < totalRounds) {
        setCurrentRoundIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        // Finished
        const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
        const accuracy = Math.round((finalCorrect / totalRounds) * 100);
        const timeBonus = Math.max(0, 500 - elapsedSeconds * 10);
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
              attention: accuracy >= 80 ? 'Sharp' : 'Good',
              reaction: `${(elapsedSeconds / totalRounds).toFixed(1)}s / pattern`,
            },
          });
        }
      }
    }, 900);
  };

  if (isFinished) {
    const accuracy = Math.round((correctCount / totalRounds) * 100);
    return (
      <GameResultScreen
        gameTitle="Quick Pattern"
        score={finalScore}
        bestScore={bestScore}
        isNewBest={!bestScore || finalScore > bestScore}
        accuracy={accuracy}
        timeSeconds={elapsedSeconds}
        cognitiveMetrics={{
          memory: 'Good',
          attention: accuracy >= 80 ? 'Sharp' : 'Developing',
          reaction: `${(elapsedSeconds / totalRounds).toFixed(1)}s / pattern`,
        }}
        onPlayAgain={initializeGame}
        onBackToHub={onBackToHub}
      />
    );
  }

  if (!currentQuestion) {
    return null;
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
              <span>🧩 Quick Pattern</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                Pattern {currentRoundIndex + 1}/{totalRounds}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Identify the rule and pick what comes next.</p>
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

      {/* Pattern Display Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-xl text-center space-y-6">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
          Complete the sequence
        </span>

        {/* Sequence Items */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {currentQuestion.sequence.map((item, idx) => {
            const isMissing = item === '?';
            return (
              <div
                key={idx}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-mono transition-all ${
                  isMissing
                    ? 'border-2 border-dashed border-teal-500/60 bg-teal-500/10 text-teal-300 shadow-lg shadow-teal-500/10 animate-pulse'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                {isMissing ? selectedOption || '?' : item}
              </div>
            );
          })}
        </div>

        {/* Feedback explanation if answered */}
        {isAnswered && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold animate-fade-in flex items-center justify-center gap-2 ${
              selectedOption === currentQuestion.correct
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {selectedOption === currentQuestion.correct ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>Rule: {currentQuestion.explanation}</span>
          </div>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {currentQuestion.shuffledOptions.map((opt, idx) => {
            const isSelected = selectedOption === opt;
            const isCorrect = opt === currentQuestion.correct;

            let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-teal-500/50 hover:bg-slate-900';
            if (isAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20';
              } else if (isSelected) {
                btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
              } else {
                btnStyle = 'bg-slate-950 border-slate-800/40 text-slate-600 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                disabled={isAnswered}
                className={`py-4 rounded-2xl border text-xl font-bold font-mono transition-all transform active:scale-95 cursor-pointer ${btnStyle}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
