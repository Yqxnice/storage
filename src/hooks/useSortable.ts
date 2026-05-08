import { useRef, useCallback, useEffect } from 'react';
import Sortable, { type SortableEvent } from 'sortablejs';

interface UseSortableOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  onMoveBox?: (boxId: string, fromGroupId: string | null, toGroupId: string | null) => void;
  enabled?: boolean;
  draggable?: string;
  filter?: string;
  group?: string;
  groupId?: string | null;
  mode?: 'boxes' | 'groups';
}

export function useSortable({
  onReorder,
  onMoveBox,
  enabled = true,
  draggable = '.allow-right-click',
  filter = '.add-slot',
  group = 'boxes',
  groupId = null,
  mode = 'boxes',
}: UseSortableOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const sortableRef = useRef<Sortable | null>(null);
  
  const onReorderRef = useRef(onReorder);
  const onMoveBoxRef = useRef(onMoveBox);
  onReorderRef.current = onReorder;
  onMoveBoxRef.current = onMoveBox;

  const setContainerRef = useCallback((el: HTMLElement | null) => {
    if (!el) {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
      containerRef.current = null;
      return;
    }

    if (containerRef.current === el && sortableRef.current) {
      return;
    }

    if (sortableRef.current) {
      sortableRef.current.destroy();
    }

    containerRef.current = el;
    
    sortableRef.current = Sortable.create(el, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter: mode === 'groups' ? '.group-boxes' : filter,
      disabled: !enabled,
      forceFallback: true,
      fallbackClass: 'sortable-fallback',
      draggable: mode === 'groups' ? '.group-item' : '.allow-right-click',
      group: mode === 'groups' ? false : {
        name: group,
        pull: true,
        put: true,
      },
      onMove: (evt) => {
        if (mode === 'groups') {
          // 防止分组被拖入到另一个分组内部
          const to = evt.to as HTMLElement;
          if (to.closest('.group-boxes')) {
            return false;
          }
        }
      },
      onStart: (evt) => {
        const target = evt.item as HTMLElement;
        if (target) {
          target.style.opacity = '0.5';
        }
      },
      onAdd: async (evt) => {
        if (mode === 'groups') return;
        
        const target = evt.item as HTMLElement;
        const boxId = target.querySelector('[data-box-id]')?.getAttribute('data-box-id') || target.dataset.boxId;
        
        if (!boxId) return;
        
        // 提取源分组和目标分组
        const fromGroupItem = evt.from?.closest('.group-item');
        const toGroupItem = evt.to?.closest('.group-item');
        const fromGroupId = fromGroupItem ? (fromGroupItem as HTMLElement).dataset.groupId : null;
        const toGroupId = toGroupItem ? (toGroupItem as HTMLElement).dataset.groupId : null;
        
        // 处理跨列表移动
        if (onMoveBoxRef.current) {
          onMoveBoxRef.current(boxId, fromGroupId, toGroupId);
        }
      },
      onEnd: async (evt: SortableEvent) => {
        const target = evt.item as HTMLElement;
        if (target) {
          target.style.opacity = '1';
        }
        
        const { oldIndex, newIndex } = evt;
        
        // 同一列表内排序
        if (evt.from === evt.to && oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
          await onReorderRef.current(oldIndex, newIndex);
        }
      },
    });
  }, [enabled, draggable, filter, group, groupId, onMoveBox, mode]);

  useEffect(() => {
    if (sortableRef.current) {
      sortableRef.current.option('disabled', !enabled);
    }
  }, [enabled]);

  return { containerRef: setContainerRef };
}
