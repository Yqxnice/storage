import { useRef, useCallback, useEffect } from 'react';
import Sortable, { type SortableEvent } from 'sortablejs';

interface UseSortableOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  enabled?: boolean;
  draggable?: string;
  filter?: string;
}

export function useSortable({
  onReorder,
  enabled = true,
  draggable = '.allow-right-click',
  filter = '.add-slot',
}: UseSortableOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const isInitializedRef = useRef(false);
  
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const setContainerRef = useCallback((el: HTMLElement | null) => {
    if (!el) {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
        isInitializedRef.current = false;
      }
      containerRef.current = null;
      return;
    }

    containerRef.current = el;

    if (isInitializedRef.current) {
      return;
    }

    console.log('[Sortable] 初始化 SortableJS');
    console.log('[Sortable] 容器:', el);
    console.log('[Sortable] 容器子元素:', el.children);
    console.log('[Sortable] draggable:', draggable);
    
    sortableRef.current = Sortable.create(el, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter,
      disabled: !enabled,
      forceFallback: true,
      fallbackClass: 'sortable-fallback',
      draggable,
      onStart: (evt) => {
        console.log('[Sortable] 拖拽开始', { item: evt.item, oldIndex: evt.oldIndex });
      },
      onEnd: (evt: SortableEvent) => {
        const { oldIndex, newIndex } = evt;
        console.log('[Sortable] 拖拽结束', { oldIndex, newIndex });
        if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
          console.log('[Sortable] 触发排序:', oldIndex, '->', newIndex);
          onReorderRef.current(oldIndex, newIndex);
        }
      },
    });
    isInitializedRef.current = true;
    console.log('[Sortable] 初始化完成');
  }, [enabled, draggable, filter]);

  useEffect(() => {
    if (sortableRef.current) {
      sortableRef.current.option('disabled', !enabled);
    }
  }, [enabled]);

  return { containerRef: setContainerRef };
}
