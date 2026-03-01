import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TaskStatus } from '../../db/types';
import { buildPrereqTree, type PrereqNode } from '../../domain/prereqTree';
import { useT } from '../../i18n';
import { Badge } from '../ui/Badge';
import styles from './PrereqTreeView.module.css';

interface PrereqTreeViewProps {
  taskId: string;
  prereqEdges: Map<string, string[]>;
  nameMap: Map<string, string>;
  progressMap: Map<string, TaskStatus>;
}

function statusBadgeVariant(status: TaskStatus) {
  if (status === 'done') return 'done' as const;
  if (status === 'in_progress') return 'inProgress' as const;
  return 'locked' as const;
}

const statusShort: Record<TaskStatus, string> = {
  not_started: '-',
  in_progress: 'WIP',
  done: 'OK',
};

function TreeNode({ node, depth }: { node: PrereqNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasChildren = node.children.length > 0;

  return (
    <div className={styles.node}>
      <div className={styles.nodeRow} onClick={() => hasChildren && setExpanded(!expanded)}>
        <span className={styles.toggle}>
          {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : ''}
        </span>
        <Badge variant={statusBadgeVariant(node.status)}>{statusShort[node.status]}</Badge>
        <span className={styles.nodeName}>{node.name}</span>
      </div>
      {hasChildren && expanded && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <TreeNode key={child.taskId} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PrereqTreeView({
  taskId,
  prereqEdges,
  nameMap,
  progressMap,
}: PrereqTreeViewProps) {
  const tree = useMemo(
    () => buildPrereqTree(taskId, prereqEdges, progressMap, nameMap),
    [taskId, prereqEdges, progressMap, nameMap],
  );

  const t = useT();

  if (tree.length === 0) {
    return <div className={styles.empty}>{t.detail_prereqs_empty}</div>;
  }

  return (
    <div className={styles.tree}>
      {tree.map((node) => (
        <TreeNode key={node.taskId} node={node} depth={0} />
      ))}
    </div>
  );
}
