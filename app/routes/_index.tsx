import { useState } from "react";
import { Timer } from "~/components/Timer";
import { RiDragMoveFill } from "react-icons/ri";
import { IoIosPause, IoIosPlay } from "react-icons/io";
import { ThemeToggler } from "~/components/ThemeToggler";
export default function Index() {
  const [isDraggable, setIsDraggable] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  return (
    <main className="rounded-xl flex flex-col justify-center items-center h-screen w-screen">
      <ThemeToggler />
      <Timer {...{ isRunning }} />
      <div className="flex items-center justify-center gap-4 mt-2">
        <button
          className="z-50 border border-black/50 dark:border-white/50 p-2 rounded-lg"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <IoIosPause /> : <IoIosPlay />}
        </button>
        <button
          className={`z-50 border border-black/50 dark:border-white/50 p-2 rounded-lg ${!isDraggable && 'bg-red-500/25'}`}
          onClick={() => setIsDraggable(!isDraggable)}
        >
          <RiDragMoveFill />
        </button>
      </div>
      <div
        className={`absolute h-screen w-screen ${
          isDraggable ? "" : "pointer-events-none"
        }`}
        {...(isDraggable && { "data-tauri-drag-region": true })}
      />
    </main>
  );
}
