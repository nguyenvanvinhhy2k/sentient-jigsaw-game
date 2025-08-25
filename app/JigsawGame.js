import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Shuffle, Image as ImageIcon, Eye, EyeOff, TimerReset } from "lucide-react";
import { motion } from "framer-motion";
import img1 from "../app/images/xephinh1.jpg"
import img2 from "../app/images/xephinh2.1.jpg"
import img3 from "../app/images/xephinh3.jpg"
import img4 from "../app/images/xephinh4.jpg"

// ---------- Utility helpers ----------
// const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------- Piece component ----------
function Piece({ piece, boardSize, imgUrl, rows, cols, onDrop, onPointerStart }) {
  const cellW = boardSize / cols;
  const cellH = boardSize / rows;
  const bgSize = `${boardSize}px ${boardSize}px`;
  const bgPos = `-${piece.col * cellW}px -${piece.row * cellH}px`;

  return (
    <motion.div
      className={`absolute select-none touch-none ${
        piece.locked ? "z-0" : "z-10"
      }`}
      style={{
        width: cellW,
        height: cellH,
        left: piece.x,
        top: piece.y,
        cursor: piece.locked ? "default" : "grab",
        borderRadius: 12,
        boxShadow: piece.locked ? "none" : "0 8px 24px rgba(0,0,0,0.22)",
        backgroundImage: `url(${imgUrl})`,
        backgroundSize: bgSize,
        backgroundPosition: bgPos,
        backgroundRepeat: "no-repeat",
        outline: piece.locked ? "1px solid rgba(0,0,0,0.08)" : "none",
      }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      onPointerDown={(e) => onPointerStart(e, piece.id)}
      onPointerUp={(e) => onDrop(e, piece.id)}
    />
  );
}

// ---------- Main component ----------
export default function JigsawGame() {
  const containerRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(img1.src)

  // grid config
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const [boardSize, setBoardSize] = useState(600);
  const [pieces, setPieces] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(true);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  // Resize observer
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const size = Math.min(el.clientWidth, 680);
      setBoardSize(size);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Build pieces
  const buildPieces = React.useCallback(() => {
    const total = rows * cols;
    const cellW = boardSize / cols;
    const cellH = boardSize / rows;
    const startRing = 40;

    const fresh = Array.from({ length: total }).map((_, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const edges = [
        { x: rand(-startRing * 3, -startRing), y: rand(-startRing, boardSize - cellH + startRing) },
        { x: rand(boardSize + startRing, boardSize + startRing * 3), y: rand(-startRing, boardSize - cellH + startRing) },
        { x: rand(-startRing, boardSize - cellW + startRing), y: rand(-startRing * 3, -startRing) },
        { x: rand(-startRing, boardSize - cellW + startRing), y: rand(boardSize + startRing, boardSize + startRing * 3) },
      ];
      const spot = edges[rand(0, edges.length - 1)];
      return { id: i, row: r, col: c, x: spot.x, y: spot.y, locked: false };
    });

    setPieces(fresh);
    setMoves(0);
    setSeconds(0);
    setRunning(true);
  }, [rows, cols, boardSize]);

  useEffect(() => {
    buildPieces();
  }, [rows, cols, imgUrl, boardSize]);

  const allLocked = useMemo(
    () => pieces.length > 0 && pieces.every((p) => p.locked),
    [pieces]
  );

  useEffect(() => {
    if (allLocked && running) setRunning(false);
  }, [allLocked, running]);

  // Drag
  const onPointerMove = (e) => {
    if (dragId === null) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    setPieces((prev) =>
      prev.map((p) => (p.id === dragId && !p.locked ? { ...p, x, y } : p))
    );
  };

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", () => setDragId(null));
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", () => setDragId(null));
    };
  });

  const handlePointerStart = (e, id) => {
    const piece = pieces.find((p) => p.id === id);
    if (!piece || piece.locked) return;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    setDragOffset({ x: localX - piece.x, y: localY - piece.y });
    setDragId(id);
  };

  const handleDrop = (e, id) => {
    const p = pieces.find((x) => x.id === id);
    if (!p || p.locked) return;
    const cellW = boardSize / cols;
    const cellH = boardSize / rows;
    const targetX = p.col * cellW;
    const targetY = p.row * cellH;
    const dist = Math.hypot(p.x - targetX, p.y - targetY);
    const snap = Math.min(cellW, cellH) * 0.35;
    setMoves((m) => m + 1);

    if (dist <= snap) {
      setPieces((prev) =>
        prev.map((pp) =>
          pp.id === id ? { ...pp, x: targetX, y: targetY, locked: true } : pp
        )
      );
    }
    setDragId(null);
  };

  const shufflePieces = () => {
    const cellW = boardSize / cols;
    const cellH = boardSize / rows;
    const pad = 40;
    setPieces((prev) =>
      prev.map((p) => ({
        ...p,
        x: rand(-pad * 3, boardSize + pad * 2 - cellW),
        y: rand(-pad * 3, boardSize + pad * 2 - cellH),
        locked: false,
      }))
    );
    setMoves(0);
    setSeconds(0);
    setRunning(true);
  };

  const revealAll = () => {
    const cellW = boardSize / cols;
    const cellH = boardSize / rows;
    setPieces((prev) =>
      prev.map((p) => ({
        ...p,
        x: p.col * cellW,
        y: p.row * cellH,
        locked: true,
      }))
    );
    setRunning(false);
  };

  // Preset images
  const presets = [
    img1.src,
    img2.src,
    img3.src,
    img4.src,
  ];

  return (
    <div className="min-h-screen w-full  flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl rounded-2xl shadow-xl bg-white p-6">
        <h2 className="text-2xl font-bold mb-2">
          Jigsaw Puzzle – React Drag & Snap
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Drag the puzzle pieces into the correct position to complete the picture. Images and number of rows/columns can be changed..
        </p>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs text-gray-500">Image URL</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="flex-1 border rounded-lg px-2 py-1"
                defaultValue={imgUrl}
                onBlur={(e) => setImgUrl(e.target.value)}
              />
              <button
                onClick={() => setShowPreview((s) => !s)}
                className="px-3 py-2 rounded-lg border flex items-center gap-2"
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPreview ? "Hide img" : "Show img"}
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {presets.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setImgUrl(u)}
                  className={`px-2 py-1 rounded-lg flex items-center gap-2 text-sm ${
                    u === imgUrl
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  <ImageIcon size={14} /> IMG {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Rows & Cols */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 cursor-pointer">
              Rows: {rows}
            </div>
            <input
              type="range"
              min={2}
              max={8}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-4 cursor-pointer">
              Cols: {cols}
            </div>
            <input
              type="range"
              min={2}
              max={8}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              onClick={shufflePieces}
              className="px-3 py-2 rounded-lg bg-gray-200 flex items-center gap-2"
            >
              <Shuffle size={16} /> Mix
            </button>
            <button
              onClick={buildPieces}
              className="px-3 py-2 rounded-lg border flex items-center gap-2"
            >
              <RefreshCw size={16} /> Restart
            </button>
            <button
              onClick={revealAll}
              className="px-3 py-2 rounded-lg text-gray-700 flex items-center gap-2"
            >
              <TimerReset size={16} /> Disclose

            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="px-3 py-1 rounded-full bg-neutral-100">
            Moves: <b>{moves}</b>
          </div>
          <div className="px-3 py-1 rounded-full bg-neutral-100">
            Time:{" "}
            <b>
              {Math.floor(seconds / 60)}:
              {String(seconds % 60).padStart(2, "0")}
            </b>
          </div>
          {allLocked ? (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium"
            >
              ✅ Complete!
            </motion.span>
          ) : (
            <span className="text-neutral-500">Playing...</span>
          )}
        </div>

        {/* Board */}
        <div ref={containerRef} className="relative mt-5 w-full">
          <div
            className="mx-auto relative"
            style={{ width: boardSize, height: boardSize }}
          >
            {showPreview && (
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundImage: `url(${imgUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.15,
                  filter: "grayscale(30%)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              />
            )}
            {pieces.map((p) => (
              <Piece
                key={p.id}
                piece={p}
                boardSize={boardSize}
                imgUrl={imgUrl}
                rows={rows}
                cols={cols}
                onDrop={handleDrop}
                onPointerStart={handlePointerStart}
              />
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-6">
          Tip: Drag the piece to roughly the right position and release – if close enough, the piece will attract itself
          into the net. Increase difficulty by increasing the number of rows/columns.
        </div>
      </div>
    </div>
  );
}
