import React, { useEffect, useState, useRef } from 'react';
import {
  Database,
  Upload,
  Download,
  Trash2,
  HardDrive,
  Package,
  AlertCircle,
  CheckCircle2,
  FileJson,
} from 'lucide-react';
import { db } from '../db/db';
import { validateQuestionPack } from '../utils/testEngine';
import type { QuestionPackMetadata, QuestionPackFile } from '../types';

export const QuestionBankPage: React.FC = () => {
  const [packs, setPacks] = useState<QuestionPackMetadata[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usedMb: number; quotaMb: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const pList = await db.questionPacks.toArray();
      setPacks(pList);

      // Storage estimate
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate();
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageInfo({
            usedMb: Math.round((est.usage / (1024 * 1024)) * 100) / 100,
            quotaMb: Math.round((est.quota / (1024 * 1024)) * 100) / 100,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportPack = async (packId: string, packName: string) => {
    try {
      const packMeta = await db.questionPacks.get(packId);
      const packQuestions = await db.questions.where('packId').equals(packId).toArray();

      const exportData: QuestionPackFile = {
        metadata: {
          id: packMeta?.id || packId,
          name: packMeta?.name || packName,
          version: packMeta?.version || '1.0.0',
          description: packMeta?.description || '',
          author: packMeta?.author,
        },
        questions: packQuestions,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packId}-questions.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleRemovePack = async (packId: string, isBundled: boolean) => {
    if (isBundled) {
      alert('The core default foundation pack is bundled and cannot be deleted.');
      return;
    }

    if (confirm('Are you sure you want to remove this custom question pack? (Existing bookmarks will be preserved)')) {
      try {
        await db.transaction('rw', db.questionPacks, db.questions, async () => {
          await db.questions.where('packId').equals(packId).delete();
          await db.questionPacks.delete(packId);
        });
        setImportStatus({ type: 'success', message: 'Question pack removed successfully.' });
        loadData();
      } catch (err) {
        console.error('Failed to remove pack:', err);
        setImportStatus({ type: 'error', message: 'Failed to remove question pack.' });
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const validation = validateQuestionPack(parsed);
        if (!validation.valid || !validation.pack) {
          setImportStatus({
            type: 'error',
            message: `Invalid Question Pack: ${validation.error || 'Failed schema validation.'}`,
          });
          return;
        }

        const pack = validation.pack;

        // Check if pack ID already exists
        const existing = await db.questionPacks.get(pack.metadata.id);
        if (existing) {
          setImportStatus({
            type: 'error',
            message: `A pack with ID "${pack.metadata.id}" already exists. Rename the pack ID in your file before re-importing.`,
          });
          return;
        }

        // Attach packId to all questions
        const enrichedQuestions = pack.questions.map((q) => ({
          ...q,
          packId: pack.metadata.id,
        }));

        await db.transaction('rw', db.questionPacks, db.questions, async () => {
          await db.questionPacks.put({
            id: pack.metadata.id,
            name: pack.metadata.name,
            version: pack.metadata.version || '1.0.0',
            description: pack.metadata.description || '',
            author: pack.metadata.author,
            questionCount: enrichedQuestions.length,
            installedAt: Date.now(),
            isBundled: false,
          });

          await db.questions.bulkPut(enrichedQuestions);
        });

        setImportStatus({
          type: 'success',
          message: `Successfully imported "${pack.metadata.name}" with ${enrichedQuestions.length} questions!`,
        });
        loadData();
      } catch (err) {
        console.error(err);
        setImportStatus({
          type: 'error',
          message: 'Failed to parse JSON file. Ensure it is a valid UTF-8 formatted JSON file.',
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-indigo-500" />
            <span>Question Bank & Storage Manager</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View installed question packs, import modular compatible JSON packs, and inspect local IndexedDB storage.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Import Question Pack</span>
          </button>
        </div>
      </div>

      {/* Import Status Alert */}
      {importStatus && (
        <div
          className={`flex items-start justify-between p-4 rounded-2xl border text-xs sm:text-sm ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-xs font-bold uppercase opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Overview Card */}
      {storageInfo && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Browser IndexedDB Storage
              </p>
              <p className="text-[11px] text-slate-500">
                {storageInfo.usedMb} MB used of {storageInfo.quotaMb} MB available quota
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Persisted & Protected
            </span>
          </div>
        </div>
      )}

      {/* Installed Packs List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Installed Question Packs ({packs.length})
        </h2>

        <div className="space-y-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {pack.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      v{pack.version}
                    </span>
                    {pack.isBundled && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Default Bundled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    {pack.description}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {pack.questionCount} Questions • Installed on {new Date(pack.installedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleExportPack(pack.id, pack.name)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold transition"
                  title="Export pack as JSON file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>

                {!pack.isBundled && (
                  <button
                    onClick={() => handleRemovePack(pack.id, pack.isBundled)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Remove pack"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pack File Format Documentation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <FileJson className="w-4 h-4 text-indigo-500" />
          <span>Custom Question Pack JSON Schema</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You can create and import your own question banks. Files must be valid JSON with a <code>metadata</code> block (<code>id</code>, <code>name</code>, <code>version</code>) and a <code>questions</code> array containing objects with <code>id</code>, <code>question</code>, <code>options</code> (minimum 2 options with <code>id</code> and <code>text</code>), <code>correctAnswer</code>, and <code>explanation</code>.
        </p>
      </div>
    </div>
  );
};
