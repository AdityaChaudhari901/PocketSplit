import { useMutation } from "@tanstack/react-query";

import {
  createExportFilename,
  formatAsCSV,
  formatAsPDF,
  getExportData,
  saveAndShareFile,
  writeTextExportFile,
  type ExportContext,
  type ExportData,
  type ExportParams
} from "@/features/export/exportService";
import { useAppStore } from "@/store/app.store";

export interface ExportMutationResult {
  data: ExportData;
  filename: string;
}

const buildLocalContext = (): ExportContext => {
  const state = useAppStore.getState();
  return {
    transactions: state.transactions,
    categories: state.categories,
    tags: state.tags,
    expenseTags: state.expenseTags,
    groups: state.groups,
    groupExpenses: state.groupExpenses,
    settlements: state.settlements
  };
};

export const useExport = () => {
  const userId = useAppStore((state) => state.profile.id);
  const authMode = useAppStore((state) => state.authMode);

  return useMutation({
    mutationFn: async (params: ExportParams): Promise<ExportMutationResult> => {
      if (!userId) {
        throw new Error("Sign in or continue in local mode before exporting.");
      }

      const context = authMode === "supabase" ? undefined : buildLocalContext();
      const data = await getExportData(userId, params, context);
      const filename = createExportFilename(params.format);

      if (params.format === "csv") {
        const csv = formatAsCSV(data);
        const uri = await writeTextExportFile(csv, filename);
        await saveAndShareFile(uri, filename, "text/csv");
        return { data, filename };
      }

      const pdfUri = await formatAsPDF(data, params);
      await saveAndShareFile(pdfUri, filename, "application/pdf");
      return { data, filename };
    }
  });
};
