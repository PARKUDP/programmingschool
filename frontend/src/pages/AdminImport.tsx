import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";

type ImportType = "materials" | "lessons" | "assignments";

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

const AdminImport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ImportType>("materials");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      showSnackbar("CSVファイルを選択してください", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("csv", file);

      const res = await authFetch(`${API_BASE_URL}/api/import/${activeTab}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      setResult(data);
      showSnackbar(`${data.imported}件のデータをインポートしました`, "success");
      setFile(null);
      
      // ファイル入力をリセット
      const input = document.getElementById(`file-input-${activeTab}`) as HTMLInputElement;
      if (input) input.value = "";
    } catch (err: any) {
      showSnackbar(err.message || "エラーが発生しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (type: ImportType) => {
    let csvContent = "";
    let filename = "";

    switch (type) {
      case "materials":
        csvContent = "title,description\nPython初級編,Pythonの基礎を学びます\n";
        filename = "materials_template.csv";
        break;
      case "lessons":
        csvContent = "material_title,title,description\nPython初級編,Lesson1,\"レッスンの内容\n複数行でも大丈夫\",\n";
        filename = "lessons_template.csv";
        break;
      case "assignments":
        csvContent = "material_title,lesson_title,title,description,problem_type,question_text,expected_output,input_example\nPython初級編,Lesson1,問題1,問題の説明,code,1から10まで出力しなさい,\"1\n2\n3\n4\n5\n6\n7\n8\n9\n10\",\n";
        filename = "assignments_template.csv";
        break;
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getFormatDescription = (type: ImportType) => {
    switch (type) {
      case "materials":
        return (
          <div className="card" style={{ marginBottom: "1.5rem", backgroundColor: "#f0f9ff", border: "2px solid #bae6fd" }}>
            <h4 style={{ marginBottom: "0.75rem", color: "#0c4a6e" }}>CSVフォーマット</h4>
            <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#0c4a6e" }}>
              列の順序: <code>title,description</code>
            </p>
            <ul style={{ marginLeft: "1.5rem", fontSize: "0.9rem", color: "#0c4a6e" }}>
              <li><strong>title</strong>: 教材のタイトル（必須）</li>
              <li><strong>description</strong>: 教材の説明（複数行OK、改行は実際に改行するか、引用符内に<code>\n</code>を記述）</li>
            </ul>
          </div>
        );
      case "lessons":
        return (
          <div className="card" style={{ marginBottom: "1.5rem", backgroundColor: "#f0f9ff", border: "2px solid #bae6fd" }}>
            <h4 style={{ marginBottom: "0.75rem", color: "#0c4a6e" }}>CSVフォーマット</h4>
            <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#0c4a6e" }}>
              列の順序: <code>material_title,title,description</code>
            </p>
            <ul style={{ marginLeft: "1.5rem", fontSize: "0.9rem", color: "#0c4a6e" }}>
              <li><strong>material_title</strong>: 教材の名前（必須、既存の教材名を指定）</li>
              <li><strong>title</strong>: レッスンのタイトル（必須）</li>
            <li><strong>description</strong>: レッスンの説明（オプション、複数行OK、改行は実際に改行を入力するか、引用符内に<code>\n</code>を記述）</li>
            </ul>
          </div>
        );
      case "assignments":
        return (
          <div className="card" style={{ marginBottom: "1.5rem", backgroundColor: "#f0f9ff", border: "2px solid #bae6fd" }}>
            <h4 style={{ marginBottom: "0.75rem", color: "#0c4a6e" }}>CSVフォーマット</h4>
            <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#0c4a6e" }}>
              列の順序: <code>material_title,lesson_title,title,description,problem_type,question_text,expected_output,input_example</code>
            </p>
            <ul style={{ marginLeft: "1.5rem", fontSize: "0.9rem", color: "#0c4a6e" }}>
              <li><strong>material_title</strong>: 教材の名前（必須、既存の教材名を指定）</li>
              <li><strong>lesson_title</strong>: レッスンの名前（必須、指定した教材配下のレッスン名を指定）</li>
              <li><strong>title</strong>: 問題のタイトル（必須）</li>
              <li><strong>description</strong>: 問題の説明（複数行OK、改行は実際に改行するか、引用符内に<code>\n</code>を記述）</li>
              <li><strong>problem_type</strong>: 問題タイプ（必須: code, choice, essay のいずれか）</li>
              <li><strong>question_text</strong>: 問題文（必須）</li>
              <li><strong>expected_output</strong>: 期待される出力（codeタイプの場合、複数行の場合は引用符内に<code>\n</code>で改行を表記）</li>
              <li><strong>input_example</strong>: 入力例（codeタイプの場合、複数行の場合は引用符内に<code>\n</code>で改行を表記）</li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="CSVインポート"
        subtitle="教材、レッスン、宿題を一括登録"
        breadcrumbs={[{ label: "管理" }, { label: "CSVインポート" }]}
      />

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #e5e7eb" }}>
        <button
          onClick={() => setActiveTab("materials")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: activeTab === "materials" ? "#4f46e5" : "transparent",
            color: activeTab === "materials" ? "white" : "#374151",
            border: "none",
            borderBottom: activeTab === "materials" ? "3px solid #4f46e5" : "none",
            cursor: "pointer",
            fontWeight: activeTab === "materials" ? "600" : "500",
            fontSize: "0.95rem",
          }}
        >
          教材
        </button>
        <button
          onClick={() => setActiveTab("lessons")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: activeTab === "lessons" ? "#4f46e5" : "transparent",
            color: activeTab === "lessons" ? "white" : "#374151",
            border: "none",
            borderBottom: activeTab === "lessons" ? "3px solid #4f46e5" : "none",
            cursor: "pointer",
            fontWeight: activeTab === "lessons" ? "600" : "500",
            fontSize: "0.95rem",
          }}
        >
          レッスン
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: activeTab === "assignments" ? "#4f46e5" : "transparent",
            color: activeTab === "assignments" ? "white" : "#374151",
            border: "none",
            borderBottom: activeTab === "assignments" ? "3px solid #4f46e5" : "none",
            cursor: "pointer",
            fontWeight: activeTab === "assignments" ? "600" : "500",
            fontSize: "0.95rem",
          }}
        >
          宿題
        </button>
      </div>

      {getFormatDescription(activeTab)}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={() => downloadTemplate(activeTab)}
            className="btn"
            style={{ backgroundColor: "#10b981", color: "white" }}
          >
            📥 テンプレートをダウンロード
          </button>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label className="form-label">CSVファイルを選択</label>
          <input
            id={`file-input-${activeTab}`}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem",
              border: "2px dashed #d1d5db",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          />
          {file && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#6b7280" }}>
              選択されたファイル: <strong>{file.name}</strong>
            </p>
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={loading || !file}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {loading ? "インポート中..." : "インポート開始"}
        </button>
      </div>

      {result && (
        <div className={`card ${result.success ? "message-success" : "message-error"}`}>
          <h3 style={{ marginBottom: "1rem" }}>インポート結果</h3>
          <p style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            成功: {result.imported}件
          </p>
          {result.errors.length > 0 && (
            <>
              <p style={{ fontSize: "0.95rem", color: "#dc2626", marginTop: "1rem", fontWeight: "600" }}>
                エラー: {result.errors.length}件
              </p>
              <ul style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.9rem", color: "#991b1b" }}>
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem", backgroundColor: "#fef3c7", border: "2px solid #fbbf24" }}>
        <h4 style={{ marginBottom: "0.75rem", color: "#92400e" }}>⚠️ 注意事項</h4>
        <ul style={{ marginLeft: "1.5rem", fontSize: "0.9rem", color: "#92400e" }}>
          <li>CSVファイルは UTF-8 エンコーディングで保存してください</li>
          <li>1行目はヘッダー行として自動的にスキップされます</li>
          <li>レッスンをインポートする前に、教材を作成してください</li>
          <li>宿題をインポートする前に、レッスンを作成してください</li>
          <li>データに誤りがある場合、その行はスキップされます</li>
          <li>大量のデータをインポートする場合、時間がかかることがあります</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminImport;
