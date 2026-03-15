import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  JournalEntry,
  CanvasCard,
  CanvasConnection,
  CanvasAnnotation,
  CanvasViewState,
  CardPosition,
} from '../types';
import {
  getEntries,
  getCanvasCards,
  getCanvasConnections,
  getCanvasAnnotations,
  getCanvasViewState,
  upsertCanvasCard,
  addCanvasConnection,
  removeCanvasConnection,
  upsertCanvasAnnotation,
  removeCanvasAnnotation,
  saveCanvasViewState,
  getTodayDateString,
  getArchivedCanvasCards,
  archiveCanvasCard,
  unarchiveCanvasCard,
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
  const [cards, setCards] = useState<CanvasCard[]>([]);
  const [connections, setConnections] = useState<CanvasConnection[]>([]);
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([]);
  const [viewState, setViewState] = useState<CanvasViewState>({
    viewOffsetX: 0,
    viewOffsetY: 0,
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
  const [archivedCards, setArchivedCards] = useState<CanvasCard[]>([]);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [allEntries, savedCards, savedConnections, savedAnnotations, savedViewState, savedArchivedCards] =
        await Promise.all([
          getEntries(),
          getCanvasCards(),
          getCanvasConnections(),
          getCanvasAnnotations(),
          getCanvasViewState(),
          getArchivedCanvasCards(),
        ]);

      setEntries(allEntries);
      setConnections(savedConnections);
      setAnnotations(savedAnnotations);
      setViewState(savedViewState);
      setArchivedCards(savedArchivedCards);

      // Create cards for new entries that don't have cards yet
      const existingEntryIds = new Set([
        ...savedCards.map((c) => c.entryId),
        ...savedArchivedCards.map((c) => c.entryId),
      ]);
      const today = getTodayDateString();

      const newCards: CanvasCard[] = [];
      let xOffset = 0;
      let yOffset = 0;
      const cardsPerRow = 3;
      let todayIndex = 0;

      allEntries.forEach((entry) => {
        if (!existingEntryIds.has(entry.id)) {
          const isToday = entry.sessionDate === today;
          let posX: number;
          let posY: number;

          if (isToday) {
            posX = (todayIndex % cardsPerRow) * (CARD_WIDTH + 40);
            posY = Math.floor(todayIndex / cardsPerRow) * (CARD_HEIGHT + 40);
            todayIndex++;
          } else {
            posX = xOffset;
            posY = yOffset + 400;
            xOffset += CARD_WIDTH + 40;
            if (xOffset > 900) {
              xOffset = 0;
              yOffset += CARD_HEIGHT + 40;
            }
          }

          newCards.push({
            id: uuidv4(),
            entryId: entry.id,
            positionX: posX,
            positionY: posY,
            color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
          });
        }
      });

      if (newCards.length > 0) {
        await Promise.all(newCards.map((card) => upsertCanvasCard(card)));
        setCards([...savedCards, ...newCards]);
      } else {
        setCards(savedCards);
      }
    };
    init();
  }, []);

  const persistCard = useCallback(async (card: CanvasCard) => {
    await upsertCanvasCard(card);
  }, []);

  const persistViewState = useCallback(async (state: CanvasViewState) => {
    await saveCanvasViewState(state);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, type: 'card' | 'annotation' | 'canvas', id?: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (type === 'card' && id) {
      const card = cards.find((c) => c.id === id);
      if (card) {
        setDragging({
          type: 'card',
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialX: card.positionX,
          initialY: card.positionY,
        });
        setSelectedCard(id);
      }
    } else if (type === 'annotation' && id) {
      const annotation = annotations.find((a) => a.id === id);
      if (annotation) {
        setDragging({
          type: 'annotation',
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialX: annotation.positionX,
          initialY: annotation.positionY,
        });
      }
    } else if (type === 'canvas') {
      setDragging({
        type: 'canvas',
        startX: e.clientX,
        startY: e.clientY,
        initialX: viewState.viewOffsetX,
        initialY: viewState.viewOffsetY,
      });
      setSelectedCard(null);
      setShowColorPicker(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / viewState.zoom;
        const dy = (e.clientY - dragging.startY) / viewState.zoom;

        if (dragging.type === 'card' && dragging.id) {
          setCards((prev) =>
            prev.map((card) =>
              card.id === dragging.id
                ? {
                    ...card,
                    positionX: dragging.initialX + dx,
                    positionY: dragging.initialY + dy,
                  }
                : card
            )
          );
        } else if (dragging.type === 'annotation' && dragging.id) {
          setAnnotations((prev) =>
            prev.map((ann) =>
              ann.id === dragging.id
                ? {
                    ...ann,
                    positionX: dragging.initialX + dx,
                    positionY: dragging.initialY + dy,
                  }
                : ann
            )
          );
        } else if (dragging.type === 'canvas') {
          setViewState((prev) => ({
            ...prev,
            viewOffsetX: dragging.initialX + dx * viewState.zoom,
            viewOffsetY: dragging.initialY + dy * viewState.zoom,
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
                    x: (e.clientX - rect.left - viewState.viewOffsetX) / viewState.zoom,
                    y: (e.clientY - rect.top - viewState.viewOffsetY) / viewState.zoom,
                  },
                }
              : null
          );
        }
      }
    },
    [dragging, connecting, viewState.zoom, viewState.viewOffsetX, viewState.viewOffsetY]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      if (dragging.type === 'card' && dragging.id) {
        const card = cards.find((c) => c.id === dragging.id);
        if (card) persistCard(card);
      } else if (dragging.type === 'annotation' && dragging.id) {
        const ann = annotations.find((a) => a.id === dragging.id);
        if (ann) upsertCanvasAnnotation(ann);
      } else if (dragging.type === 'canvas') {
        persistViewState(viewState);
      }
    }
    setDragging(null);
  }, [dragging, cards, annotations, viewState, persistCard, persistViewState]);

  const startConnecting = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      const centerX = card.positionX + CARD_WIDTH / 2;
      const centerY = card.positionY + CARD_HEIGHT / 2;
      setConnecting({
        fromCardId: cardId,
        startPos: { x: centerX, y: centerY },
        currentPos: { x: centerX, y: centerY },
      });
    }
  };

  const finishConnecting = async (toCardId: string) => {
    if (connecting && connecting.fromCardId !== toCardId) {
      const newConnection: CanvasConnection = {
        id: uuidv4(),
        fromCardId: connecting.fromCardId,
        toCardId,
      };
      const exists = connections.some(
        (c) =>
          (c.fromCardId === newConnection.fromCardId && c.toCardId === newConnection.toCardId) ||
          (c.fromCardId === newConnection.toCardId && c.toCardId === newConnection.fromCardId)
      );
      if (!exists) {
        await addCanvasConnection(newConnection);
        setConnections((prev) => [...prev, newConnection]);
      }
    }
    setConnecting(null);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    await removeCanvasConnection(connectionId);
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  };

  const changeCardColor = async (cardId: string, color: string) => {
    const updatedCards = cards.map((card) =>
      card.id === cardId ? { ...card, color } : card
    );
    setCards(updatedCards);
    const updated = updatedCards.find((c) => c.id === cardId);
    if (updated) await upsertCanvasCard(updated);
    setShowColorPicker(null);
  };

  const handleAddAnnotation = async (e: React.MouseEvent) => {
    if (e.detail === 2) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - viewState.viewOffsetX) / viewState.zoom;
        const y = (e.clientY - rect.top - viewState.viewOffsetY) / viewState.zoom;
        const newAnnotation: CanvasAnnotation = {
          id: uuidv4(),
          text: 'New note...',
          positionX: x,
          positionY: y,
        };
        await upsertCanvasAnnotation(newAnnotation);
        setAnnotations((prev) => [...prev, newAnnotation]);
        setEditingAnnotation(newAnnotation.id);
        setAnnotationInput('New note...');
      }
    }
  };

  const saveAnnotationText = async (id: string) => {
    if (annotationInput.trim()) {
      const updated = annotations.map((ann) =>
        ann.id === id ? { ...ann, text: annotationInput.trim() } : ann
      );
      setAnnotations(updated);
      const ann = updated.find((a) => a.id === id);
      if (ann) await upsertCanvasAnnotation(ann);
    } else {
      await removeCanvasAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    }
    setEditingAnnotation(null);
    setAnnotationInput('');
  };

  const deleteAnnotation = async (id: string) => {
    await removeCanvasAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleArchiveCard = async (cardId: string) => {
    await archiveCanvasCard(cardId);
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      setArchivedCards((prev) => [...prev, card]);
    }
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setConnections((prev) =>
      prev.filter((c) => c.fromCardId !== cardId && c.toCardId !== cardId)
    );
    setSelectedCard(null);
    setShowColorPicker(null);
  };

  const handleUnarchiveCard = async (cardId: string) => {
    await unarchiveCanvasCard(cardId);
    const card = archivedCards.find((c) => c.id === cardId);
    if (card) {
      setCards((prev) => [...prev, card]);
    }
    setArchivedCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(viewState.zoom * delta, 0.25), 2);
    const newState = { ...viewState, zoom: newZoom };
    setViewState(newState);
    persistViewState(newState);
  };

  const resetView = () => {
    const newState = { viewOffsetX: 0, viewOffsetY: 0, zoom: 1 };
    setViewState(newState);
    persistViewState(newState);
  };

  const getEntryForCard = (card: CanvasCard): JournalEntry | undefined => {
    return entries.find((e) => e.id === card.entryId);
  };

  const getCardCenter = (card: CanvasCard): CardPosition => ({
    x: card.positionX + CARD_WIDTH / 2,
    y: card.positionY + CARD_HEIGHT / 2,
  });

  return (
    <div className="canvas-page">
      <div className="canvas-toolbar">
        <h2>Reflection Canvas</h2>
        <div className="toolbar-actions">
          <button
            className={`btn btn-small ${showArchive ? 'btn-active' : ''}`}
            onClick={() => setShowArchive(!showArchive)}
          >
            Archive ({archivedCards.length})
          </button>
          <span className="zoom-level">{Math.round(viewState.zoom * 100)}%</span>
          <button className="btn btn-small" onClick={resetView}>
            Reset View
          </button>
        </div>
      </div>

      <div className="canvas-hint">
        Double-click to add annotation • Drag cards to move • Click connector button to link cards
      </div>

      <div className="canvas-body">
        {showArchive && (
          <div className="archive-sidebar">
            <div className="archive-header">
              <h3>Archived Cards</h3>
              <button
                className="archive-close-btn"
                onClick={() => setShowArchive(false)}
              >
                ×
              </button>
            </div>
            {archivedCards.length === 0 ? (
              <div className="archive-empty">No archived cards</div>
            ) : (
              <div className="archive-list">
                {archivedCards.map((card) => {
                  const entry = entries.find((e) => e.id === card.entryId);
                  if (!entry) return null;
                  return (
                    <div
                      key={card.id}
                      className="archive-item"
                      style={{ borderLeftColor: card.color }}
                    >
                      <div className="archive-item-question">{entry.questionText}</div>
                      <div className="archive-item-answer">{entry.answer}</div>
                      <div className="archive-item-footer">
                        <span className="archive-item-date">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          className="btn btn-small"
                          onClick={() => handleUnarchiveCard(card.id)}
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      <div
        ref={canvasRef}
        className="canvas-container"
        onMouseDown={(e) => handleMouseDown(e, 'canvas')}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleAddAnnotation}
        onWheel={handleWheel}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${viewState.viewOffsetX}px, ${viewState.viewOffsetY}px) scale(${viewState.zoom})`,
          }}
        >
          {/* Connections */}
          <svg className="connections-layer">
            {connections.map((conn) => {
              const fromCard = cards.find((c) => c.id === conn.fromCardId);
              const toCard = cards.find((c) => c.id === conn.toCardId);
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
                    onClick={() => handleRemoveConnection(conn.id)}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fontSize="14"
                    fill="var(--primary)"
                    className="connection-delete-icon"
                    onClick={() => handleRemoveConnection(conn.id)}
                  >
                    ×
                  </text>
                </g>
              );
            })}

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
          {cards.map((card) => {
            const entry = getEntryForCard(card);
            if (!entry) return null;

            return (
              <div
                key={card.id}
                className={`canvas-card ${selectedCard === card.id ? 'selected' : ''} ${
                  connecting ? 'connecting-mode' : ''
                }`}
                style={{
                  left: card.positionX,
                  top: card.positionY,
                  backgroundColor: card.color,
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

                <button
                  className="card-archive-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveCard(card.id);
                  }}
                  title="Archive card"
                >
                  ×
                </button>

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
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className={`canvas-annotation ${editingAnnotation === annotation.id ? 'editing' : ''}`}
              style={{
                left: annotation.positionX,
                top: annotation.positionY,
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
                    onBlur={() => saveAnnotationText(annotation.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveAnnotationText(annotation.id);
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

        {cards.length === 0 && (
          <div className="canvas-empty">
            <div className="empty-icon">🌸</div>
            <h3>Your canvas is empty</h3>
            <p>Complete a daily journal session to see your reflections here</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
