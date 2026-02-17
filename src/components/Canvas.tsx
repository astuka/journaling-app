import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  JournalEntry,
  CanvasState,
  CanvasCard,
  Connection,
  Annotation,
  CardPosition,
} from '../types';
import {
  getEntries,
  getCanvasState,
  saveCanvasState,
  getTodayDateString,
} from '../utils/storage';
import './Canvas.css';

const CARD_COLORS = [
  '#FF6B6B', // coral
  '#4ECDC4', // teal
  '#45B7D1', // sky
  '#96CEB4', // sage
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#F7DC6F', // gold
  '#BB8FCE', // lavender
  '#85C1E9', // blue
];

const CARD_WIDTH = 280;
const CARD_HEIGHT = 180;

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    cards: [],
    connections: [],
    annotations: [],
    viewOffset: { x: 0, y: 0 },
    zoom: 1,
  });
  const [dragging, setDragging] = useState<{
    type: 'card' | 'annotation' | 'canvas';
    id?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [connecting, setConnecting] = useState<{
    fromCardId: string;
    startPos: CardPosition;
    currentPos: CardPosition;
  } | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [annotationInput, setAnnotationInput] = useState('');

  useEffect(() => {
    const allEntries = getEntries();
    setEntries(allEntries);

    const savedState = getCanvasState();
    
    // Create cards for new entries that don't have cards yet
    const existingEntryIds = new Set(savedState.cards.map((c) => c.entryId));
    const today = getTodayDateString();
    
    let newCards: CanvasCard[] = [];
    let xOffset = 0;
    let yOffset = 0;
    const cardsPerRow = 3;
    let todayIndex = 0;

    allEntries.forEach((entry) => {
      if (!existingEntryIds.has(entry.id)) {
        // New entry - create a card for it
        const isToday = entry.sessionDate === today;
        const position = isToday
          ? {
              x: (todayIndex % cardsPerRow) * (CARD_WIDTH + 40),
              y: Math.floor(todayIndex / cardsPerRow) * (CARD_HEIGHT + 40),
            }
          : {
              x: xOffset,
              y: yOffset + 400, // Place older entries below
            };

        if (isToday) {
          todayIndex++;
        } else {
          xOffset += CARD_WIDTH + 40;
          if (xOffset > 900) {
            xOffset = 0;
            yOffset += CARD_HEIGHT + 40;
          }
        }

        newCards.push({
          id: uuidv4(),
          entryId: entry.id,
          position,
          style: { color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)] },
        });
      }
    });

    if (newCards.length > 0) {
      const updatedState = {
        ...savedState,
        cards: [...savedState.cards, ...newCards],
      };
      saveCanvasState(updatedState);
      setCanvasState(updatedState);
    } else {
      setCanvasState(savedState);
    }
  }, []);

  const save = useCallback((state: CanvasState) => {
    setCanvasState(state);
    saveCanvasState(state);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, type: 'card' | 'annotation' | 'canvas', id?: string) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();

    if (type === 'card' && id) {
      const card = canvasState.cards.find((c) => c.id === id);
      if (card) {
        setDragging({
          type: 'card',
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialX: card.position.x,
          initialY: card.position.y,
        });
        setSelectedCard(id);
      }
    } else if (type === 'annotation' && id) {
      const annotation = canvasState.annotations.find((a) => a.id === id);
      if (annotation) {
        setDragging({
          type: 'annotation',
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialX: annotation.position.x,
          initialY: annotation.position.y,
        });
      }
    } else if (type === 'canvas') {
      setDragging({
        type: 'canvas',
        startX: e.clientX,
        startY: e.clientY,
        initialX: canvasState.viewOffset.x,
        initialY: canvasState.viewOffset.y,
      });
      setSelectedCard(null);
      setShowColorPicker(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / canvasState.zoom;
        const dy = (e.clientY - dragging.startY) / canvasState.zoom;

        if (dragging.type === 'card' && dragging.id) {
          const newCards = canvasState.cards.map((card) =>
            card.id === dragging.id
              ? {
                  ...card,
                  position: {
                    x: dragging.initialX + dx,
                    y: dragging.initialY + dy,
                  },
                }
              : card
          );
          setCanvasState((prev) => ({ ...prev, cards: newCards }));
        } else if (dragging.type === 'annotation' && dragging.id) {
          const newAnnotations = canvasState.annotations.map((ann) =>
            ann.id === dragging.id
              ? {
                  ...ann,
                  position: {
                    x: dragging.initialX + dx,
                    y: dragging.initialY + dy,
                  },
                }
              : ann
          );
          setCanvasState((prev) => ({ ...prev, annotations: newAnnotations }));
        } else if (dragging.type === 'canvas') {
          setCanvasState((prev) => ({
            ...prev,
            viewOffset: {
              x: dragging.initialX + dx * canvasState.zoom,
              y: dragging.initialY + dy * canvasState.zoom,
            },
          }));
        }
      }

      if (connecting) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setConnecting((prev) =>
            prev
              ? {
                  ...prev,
                  currentPos: {
                    x: (e.clientX - rect.left - canvasState.viewOffset.x) / canvasState.zoom,
                    y: (e.clientY - rect.top - canvasState.viewOffset.y) / canvasState.zoom,
                  },
                }
              : null
          );
        }
      }
    },
    [dragging, connecting, canvasState.zoom, canvasState.viewOffset, canvasState.cards, canvasState.annotations]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging && (dragging.type === 'card' || dragging.type === 'annotation')) {
      save(canvasState);
    }
    setDragging(null);
  }, [dragging, canvasState, save]);

  const startConnecting = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = canvasState.cards.find((c) => c.id === cardId);
    if (card) {
      const centerX = card.position.x + CARD_WIDTH / 2;
      const centerY = card.position.y + CARD_HEIGHT / 2;
      setConnecting({
        fromCardId: cardId,
        startPos: { x: centerX, y: centerY },
        currentPos: { x: centerX, y: centerY },
      });
    }
  };

  const finishConnecting = (toCardId: string) => {
    if (connecting && connecting.fromCardId !== toCardId) {
      const newConnection: Connection = {
        id: uuidv4(),
        fromCardId: connecting.fromCardId,
        toCardId,
      };
      const exists = canvasState.connections.some(
        (c) =>
          (c.fromCardId === newConnection.fromCardId && c.toCardId === newConnection.toCardId) ||
          (c.fromCardId === newConnection.toCardId && c.toCardId === newConnection.fromCardId)
      );
      if (!exists) {
        save({
          ...canvasState,
          connections: [...canvasState.connections, newConnection],
        });
      }
    }
    setConnecting(null);
  };

  const removeConnection = (connectionId: string) => {
    save({
      ...canvasState,
      connections: canvasState.connections.filter((c) => c.id !== connectionId),
    });
  };

  const changeCardColor = (cardId: string, color: string) => {
    const newCards = canvasState.cards.map((card) =>
      card.id === cardId ? { ...card, style: { ...card.style, color } } : card
    );
    save({ ...canvasState, cards: newCards });
    setShowColorPicker(null);
  };

  const addAnnotation = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      // Double click
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - canvasState.viewOffset.x) / canvasState.zoom;
        const y = (e.clientY - rect.top - canvasState.viewOffset.y) / canvasState.zoom;
        const newAnnotation: Annotation = {
          id: uuidv4(),
          text: 'New note...',
          position: { x, y },
        };
        save({
          ...canvasState,
          annotations: [...canvasState.annotations, newAnnotation],
        });
        setEditingAnnotation(newAnnotation.id);
        setAnnotationInput('New note...');
      }
    }
  };

  const saveAnnotation = (id: string) => {
    if (annotationInput.trim()) {
      const newAnnotations = canvasState.annotations.map((ann) =>
        ann.id === id ? { ...ann, text: annotationInput.trim() } : ann
      );
      save({ ...canvasState, annotations: newAnnotations });
    } else {
      // Remove empty annotations
      save({
        ...canvasState,
        annotations: canvasState.annotations.filter((a) => a.id !== id),
      });
    }
    setEditingAnnotation(null);
    setAnnotationInput('');
  };

  const deleteAnnotation = (id: string) => {
    save({
      ...canvasState,
      annotations: canvasState.annotations.filter((a) => a.id !== id),
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(canvasState.zoom * delta, 0.25), 2);
    save({ ...canvasState, zoom: newZoom });
  };

  const resetView = () => {
    save({ ...canvasState, viewOffset: { x: 0, y: 0 }, zoom: 1 });
  };

  const getEntryForCard = (card: CanvasCard): JournalEntry | undefined => {
    return entries.find((e) => e.id === card.entryId);
  };

  const getCardCenter = (card: CanvasCard): CardPosition => ({
    x: card.position.x + CARD_WIDTH / 2,
    y: card.position.y + CARD_HEIGHT / 2,
  });

  return (
    <div className="canvas-page">
      <div className="canvas-toolbar">
        <h2>Reflection Canvas</h2>
        <div className="toolbar-actions">
          <span className="zoom-level">{Math.round(canvasState.zoom * 100)}%</span>
          <button className="btn btn-small" onClick={resetView}>
            Reset View
          </button>
        </div>
      </div>

      <div className="canvas-hint">
        Double-click to add annotation • Drag cards to move • Click connector button to link cards
      </div>

      <div
        ref={canvasRef}
        className="canvas-container"
        onMouseDown={(e) => handleMouseDown(e, 'canvas')}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={addAnnotation}
        onWheel={handleWheel}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${canvasState.viewOffset.x}px, ${canvasState.viewOffset.y}px) scale(${canvasState.zoom})`,
          }}
        >
          {/* Connections */}
          <svg className="connections-layer">
            {canvasState.connections.map((conn) => {
              const fromCard = canvasState.cards.find((c) => c.id === conn.fromCardId);
              const toCard = canvasState.cards.find((c) => c.id === conn.toCardId);
              if (!fromCard || !toCard) return null;

              const from = getCardCenter(fromCard);
              const to = getCardCenter(toCard);
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              return (
                <g key={conn.id} className="connection">
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                  />
                  <circle
                    cx={midX}
                    cy={midY}
                    r="12"
                    fill="var(--surface)"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    className="connection-delete"
                    onClick={() => removeConnection(conn.id)}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fontSize="14"
                    fill="var(--primary)"
                    className="connection-delete-icon"
                    onClick={() => removeConnection(conn.id)}
                  >
                    ×
                  </text>
                </g>
              );
            })}

            {/* Active connection line */}
            {connecting && (
              <line
                x1={connecting.startPos.x}
                y1={connecting.startPos.y}
                x2={connecting.currentPos.x}
                y2={connecting.currentPos.y}
                stroke="var(--primary)"
                strokeWidth="3"
                strokeDasharray="8,4"
                opacity="0.6"
              />
            )}
          </svg>

          {/* Cards */}
          {canvasState.cards.map((card) => {
            const entry = getEntryForCard(card);
            if (!entry) return null;

            return (
              <div
                key={card.id}
                className={`canvas-card ${selectedCard === card.id ? 'selected' : ''} ${
                  connecting ? 'connecting-mode' : ''
                }`}
                style={{
                  left: card.position.x,
                  top: card.position.y,
                  backgroundColor: card.style.color,
                  width: CARD_WIDTH,
                  minHeight: CARD_HEIGHT,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'card', card.id)}
                onClick={() => connecting && finishConnecting(card.id)}
              >
                <div className="card-question">{entry.questionText}</div>
                <div className="card-answer">{entry.answer}</div>
                <div className="card-date">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </div>

                <div className="card-actions">
                  <button
                    className="card-action-btn connect"
                    onClick={(e) => startConnecting(card.id, e)}
                    title="Connect to another card"
                  >
                    🔗
                  </button>
                  <button
                    className="card-action-btn color"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorPicker(showColorPicker === card.id ? null : card.id);
                    }}
                    title="Change color"
                  >
                    🎨
                  </button>
                </div>

                {showColorPicker === card.id && (
                  <div className="color-picker" onClick={(e) => e.stopPropagation()}>
                    {CARD_COLORS.map((color) => (
                      <button
                        key={color}
                        className="color-swatch"
                        style={{ backgroundColor: color }}
                        onClick={() => changeCardColor(card.id, color)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Annotations */}
          {canvasState.annotations.map((annotation) => (
            <div
              key={annotation.id}
              className={`canvas-annotation ${editingAnnotation === annotation.id ? 'editing' : ''}`}
              style={{
                left: annotation.position.x,
                top: annotation.position.y,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'annotation', annotation.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingAnnotation(annotation.id);
                setAnnotationInput(annotation.text);
              }}
            >
              {editingAnnotation === annotation.id ? (
                <div className="annotation-edit">
                  <textarea
                    value={annotationInput}
                    onChange={(e) => setAnnotationInput(e.target.value)}
                    autoFocus
                    onBlur={() => saveAnnotation(annotation.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveAnnotation(annotation.id);
                      }
                      if (e.key === 'Escape') {
                        setEditingAnnotation(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="annotation-text">{annotation.text}</div>
                  <button
                    className="annotation-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(annotation.id);
                    }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {canvasState.cards.length === 0 && (
          <div className="canvas-empty">
            <div className="empty-icon">🌸</div>
            <h3>Your canvas is empty</h3>
            <p>Complete a daily journal session to see your reflections here</p>
          </div>
        )}
      </div>
    </div>
  );
}
