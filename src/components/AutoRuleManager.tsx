import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from './../store';
import type { AutoRule, RuleCondition } from './../types';

const FIELD_OPTIONS: { value: RuleCondition['field']; label: string }[] = [
  { value: 'fileType', label: '文件类型' },
  { value: 'fileName', label: '文件名' },
  { value: 'filePath', label: '文件路径' },
  { value: 'dateAdded', label: '添加时间' }
];

const OPERATOR_OPTIONS: Record<RuleCondition['field'], { value: RuleCondition['operator']; label: string }[]> = {
  fileType: [
    { value: 'equals', label: '等于' }
  ],
  fileName: [
    { value: 'contains', label: '包含' },
    { value: 'startsWith', label: '开头是' },
    { value: 'endsWith', label: '结尾是' },
    { value: 'equals', label: '等于' }
  ],
  filePath: [
    { value: 'contains', label: '包含' },
    { value: 'startsWith', label: '开头是' },
    { value: 'endsWith', label: '结尾是' },
    { value: 'equals', label: '等于' }
  ],
  dateAdded: [
    { value: 'before', label: '之前' },
    { value: 'after', label: '之后' }
  ]
};

const FILE_TYPE_OPTIONS = [
  'image', 'document', 'video', 'audio', 'archive', 'code'
];

export const AutoRuleManager: React.FC = () => {
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const { boxes } = useStore();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const loadedRules = await invoke<AutoRule[]>('load_auto_rules');
      setRules(loadedRules);
    } catch (error) {
      console.error('加载规则失败:', error);
    }
  };

  const saveRules = async (newRules: AutoRule[]) => {
    try {
      await invoke('save_auto_rules', { rules: newRules });
      setRules(newRules);
    } catch (error) {
      console.error('保存规则失败:', error);
    }
  };

  const addRule = () => {
    const newRule: AutoRule = {
      id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
      name: '新规则',
      enabled: true,
      conditions: [],
      targetBoxId: boxes[0]?.id || '',
      action: 'move',
      order: rules.length
    };
    setRules([...rules, newRule]);
    setEditingRuleId(newRule.id);
  };

  const addCondition = (ruleId: string) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        const newCondition: RuleCondition = {
          field: 'fileType',
          operator: 'equals',
          value: 'image'
        };
        return { ...rule, conditions: [...rule.conditions, newCondition] };
      }
      return rule;
    }));
  };

  const updateCondition = (ruleId: string, conditionIndex: number, updates: Partial<RuleCondition>) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        const newConditions = rule.conditions.map((cond, idx) =>
          idx === conditionIndex ? { ...cond, ...updates } : cond
        );
        return { ...rule, conditions: newConditions };
      }
      return rule;
    }));
  };

  const removeCondition = (ruleId: string, conditionIndex: number) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        const newConditions = rule.conditions.filter((_, idx) => idx !== conditionIndex);
        return { ...rule, conditions: newConditions };
      }
      return rule;
    }));
  };

  const updateRule = (ruleId: string, updates: Partial<AutoRule>) => {
    setRules(rules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  const deleteRule = (ruleId: string) => {
    const newRules = rules.filter(r => r.id !== ruleId);
    setRules(newRules.map((r, idx) => ({ ...r, order: idx })));
  };

  const toggleRuleEnabled = (ruleId: string) => {
    setRules(rules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleSave = () => {
    saveRules(rules.map((r, idx) => ({ ...r, order: idx })));
    setEditingRuleId(null);
  };

  return (
    <div className="page-section">
      <div className="page-section-title">自动归类规则</div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label" style={{ flex: 1 }}>
            <div className="page-row-name">规则管理</div>
            <div className="page-row-desc">设置文件自动归类的规则条件和目标收纳盒</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addRule} className="page-btn" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: 'white' }}>
              + 添加规则
            </button>
            <button onClick={handleSave} className="page-btn">
              保存规则
            </button>
          </div>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="page-card">
          <div className="page-row">
            <div className="page-row-label" style={{ textAlign: 'center', flex: 1 }}>
              <div className="page-row-desc" style={{ fontSize: 13, color: 'var(--txt2)' }}>
                暂无规则，点击上方按钮添加
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rules-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="page-card"
              style={{ opacity: rule.enabled ? 1 : 0.6 }}
            >
              <div className="page-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt3)'
                  }}>
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                    className="rule-name-input"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div
                        className={`page-toggle ${rule.enabled ? "on" : ""}`}
                        onClick={() => toggleRuleEnabled(rule.id)}
                      >
                        <div className="page-toggle-thumb"></div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--txt2)' }}>启用</span>
                    </div>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="page-btn danger"
                      style={{ padding: '0 10px' }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>

              <div className="rule-conditions" style={{ padding: '12px 14px', borderTop: '0.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 500 }}>条件</span>
                  <button
                    onClick={() => addCondition(rule.id)}
                    className="add-condition-btn"
                  >
                    + 添加条件
                  </button>
                </div>

                {rule.conditions.length === 0 ? (
                  <p style={{ fontSize: 11, color: 'var(--txt3)', fontStyle: 'italic', margin: 0 }}>
                    请添加条件
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rule.conditions.map((condition, condIndex) => (
                      <div key={condIndex} className="condition-item">
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(rule.id, condIndex, { field: e.target.value as RuleCondition['field'] })}
                          className="rule-select"
                        >
                          {FIELD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(rule.id, condIndex, { operator: e.target.value as RuleCondition['operator'] })}
                          className="rule-select"
                        >
                          {OPERATOR_OPTIONS[condition.field].map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {condition.field === 'fileType' ? (
                          <select
                            value={condition.value}
                            onChange={(e) => updateCondition(rule.id, condIndex, { value: e.target.value })}
                            className="rule-select"
                          >
                            {FILE_TYPE_OPTIONS.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        ) : condition.field === 'dateAdded' ? (
                          <input
                            type="datetime-local"
                            value={condition.value}
                            onChange={(e) => updateCondition(rule.id, condIndex, { value: e.target.value })}
                            className="rule-input"
                          />
                        ) : (
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(rule.id, condIndex, { value: e.target.value })}
                            placeholder="输入值"
                            className="rule-input rule-input-flex"
                          />
                        )}

                        <button
                          onClick={() => removeCondition(rule.id, condIndex)}
                          className="remove-condition-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rule-action" style={{ padding: '10px 14px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--txt3)' }}>
                <span>执行动作：</span>
                <select
                  value={rule.action}
                  onChange={(e) => updateRule(rule.id, { action: e.target.value as 'move' | 'copy' })}
                  className="rule-select"
                >
                  <option value="move">移动到</option>
                  <option value="copy">复制到</option>
                </select>
                <select
                  value={rule.targetBoxId}
                  onChange={(e) => updateRule(rule.id, { targetBoxId: e.target.value })}
                  className="rule-select"
                >
                  <option value="">选择收纳盒</option>
                  {boxes.map(box => (
                    <option key={box.id} value={box.id}>{box.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .rule-name-input {
          flex: 1;
          height: 26px;
          padding: 0 8px;
          background: var(--surface);
          border: 0.5px solid var(--border-lit);
          border-radius: 5px;
          color: var(--txt);
          font-size: 12px;
          outline: none;
          font-weight: 500;
        }

        .add-condition-btn {
          padding: 2px 8px;
          border: 0.5px dashed var(--border);
          border-radius: 4px;
          background: transparent;
          color: var(--txt3);
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .add-condition-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .condition-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--bg);
          border-radius: 6px;
        }

        .rule-select {
          padding: 3px 6px;
          border: 0.5px solid var(--border);
          border-radius: 4px;
          background: var(--surface);
          font-size: 11px;
          color: var(--txt2);
          cursor: pointer;
          outline: none;
        }

        .rule-input {
          padding: 3px 8px;
          border: 0.5px solid var(--border);
          border-radius: 4px;
          background: var(--surface);
          font-size: 11px;
          color: var(--txt);
          outline: none;
        }

        .rule-input-flex {
          flex: 1;
        }

        .remove-condition-btn {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--txt3);
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .remove-condition-btn:hover {
          background: var(--color-error-light);
          color: var(--color-error-dark);
        }
      `}</style>
    </div>
  );
};

export default AutoRuleManager;