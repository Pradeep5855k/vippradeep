import React, { useState } from 'react';
import { Lock, ShieldCheck, Delete } from 'lucide-react';

interface PinLockModalProps {
  isLocked: boolean;
  correctPin: string;
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isLocked,
  correctPin,
  onUnlock,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setErrorMsg(false);

      if (next.length === 4) {
        if (next === correctPin) {
          setTimeout(() => {
            setEnteredPin('');
            onUnlock();
          }, 150);
        } else {
          setErrorMsg(true);
          setTimeout(() => {
            setEnteredPin('');
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900">Billing Pro Locked</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Enter your 4-digit security PIN to continue
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                enteredPin.length > index
                  ? errorMsg
                    ? 'bg-red-500 scale-110'
                    : 'bg-blue-600 scale-110'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-red-600 mb-4 animate-bounce">
            Incorrect PIN. Please try again.
          </p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 active:text-blue-600 text-lg font-bold text-slate-800 transition flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 active:text-blue-600 text-lg font-bold text-slate-800 transition flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-red-50 active:text-red-600 text-sm font-semibold text-slate-600 transition flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          Default PIN is <span className="font-mono font-semibold">1234</span>
        </p>
      </div>
    </div>
  );
};
