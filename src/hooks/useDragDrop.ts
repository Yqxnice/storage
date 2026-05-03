import { useCallback, useState, useRef} from 'react';

interface UseDragDropOptions<T> {
  onDragStart?: (item: T) => void;
  onDragEnd?: (item: T) => void;
  onDrop?: (fromIndex: number, toIndex: number) => void;
  onDragOver?: (index: number) => void;
}

export function useDragDrop<T>(options: UseDragDropOptions<T> = {}) {
  const { onDragStart, onDragEnd, onDrop, onDragOver } = options;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragDataRef = useRef<T | null>(null);

  const handleDragStart = useCallback((index: number, item: T) => {
    setDraggedIndex(index);
    dragDataRef.current = item;
    onDragStart?.(item);
  }, [onDragStart]);

  const handleDragEnd = useCallback(() => {
    if (dragDataRef.current) {
      onDragEnd?.(dragDataRef.current);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragDataRef.current = null;
  }, [onDragEnd]);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
    onDragOver?.(index);
  }, [draggedIndex, onDragOver]);

  const handleDrop = useCallback((toIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onDrop?.(draggedIndex, toIndex);
    }
    handleDragEnd();
  }, [draggedIndex, onDrop, handleDragEnd]);

  const getDragHandlers = useCallback((index: number, item: T) => ({
    draggable: true,
    onDragStart: () => handleDragStart(index, item),
    onDragEnd: handleDragEnd,
    onDragOver: (e: React.DragEvent) => handleDragOver(index, e),
    onDrop: (e: React.DragEvent) => handleDrop(index, e),
  }), [handleDragStart, handleDragEnd, handleDragOver, handleDrop]);

  return {
    draggedIndex,
    dragOverIndex,
    getDragHandlers,
  };
}
