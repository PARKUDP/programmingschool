import React, { useEffect } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: number | string;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, height = "300px" }) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;

    // Python の補完プロバイダーを登録
    const pythonCompletionProvider = monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        // Python の一般的な関数やメソッド
        const suggestions = [
          // Built-in 関数
          { label: "print", kind: 14, insertText: "print($0)", detail: "組み込み関数: 値を出力する" },
          { label: "len", kind: 14, insertText: "len($0)", detail: "組み込み関数: 長さを返す" },
          { label: "range", kind: 14, insertText: "range($0)", detail: "組み込み関数: 数列を生成する" },
          { label: "input", kind: 14, insertText: "input($0)", detail: "組み込み関数: ユーザー入力を受け取る" },
          { label: "int", kind: 14, insertText: "int($0)", detail: "組み込み関数: 整数に変換" },
          { label: "str", kind: 14, insertText: "str($0)", detail: "組み込み関数: 文字列に変換" },
          { label: "float", kind: 14, insertText: "float($0)", detail: "組み込み関数: 浮動小数点数に変換" },
          { label: "list", kind: 14, insertText: "list($0)", detail: "組み込み関数: リストを作成" },
          { label: "dict", kind: 14, insertText: "dict($0)", detail: "組み込み関数: 辞書を作成" },
          { label: "set", kind: 14, insertText: "set($0)", detail: "組み込み関数: セットを作成" },
          { label: "sum", kind: 14, insertText: "sum($0)", detail: "組み込み関数: 合計を計算" },
          { label: "max", kind: 14, insertText: "max($0)", detail: "組み込み関数: 最大値を返す" },
          { label: "min", kind: 14, insertText: "min($0)", detail: "組み込み関数: 最小値を返す" },
          { label: "sorted", kind: 14, insertText: "sorted($0)", detail: "組み込み関数: ソート済みリストを返す" },
          { label: "enumerate", kind: 14, insertText: "enumerate($0)", detail: "組み込み関数: インデックス付きで反復" },
          { label: "zip", kind: 14, insertText: "zip($0)", detail: "組み込み関数: 複数のイテラブルをまとめる" },
          { label: "map", kind: 14, insertText: "map($0)", detail: "組み込み関数: 関数をすべての要素に適用" },
          { label: "filter", kind: 14, insertText: "filter($0)", detail: "組み込み関数: 条件に合う要素をフィルタ" },
          { label: "abs", kind: 14, insertText: "abs($0)", detail: "組み込み関数: 絶対値を返す" },
          { label: "round", kind: 14, insertText: "round($0)", detail: "組み込み関数: 四捨五入" },

          // キーワード
          { label: "if", kind: 14, insertText: "if $0:", detail: "条件分岐" },
          { label: "elif", kind: 14, insertText: "elif $0:", detail: "条件分岐（その他の場合）" },
          { label: "else", kind: 14, insertText: "else:", detail: "条件分岐（そうでない場合）" },
          { label: "for", kind: 14, insertText: "for $0 in:", detail: "ループ（確定回数）" },
          { label: "while", kind: 14, insertText: "while $0:", detail: "ループ（条件付き）" },
          { label: "def", kind: 14, insertText: "def $0():", detail: "関数定義" },
          { label: "class", kind: 14, insertText: "class $0:", detail: "クラス定義" },
          { label: "try", kind: 14, insertText: "try:", detail: "例外処理" },
          { label: "except", kind: 14, insertText: "except $0:", detail: "例外をキャッチ" },
          { label: "finally", kind: 14, insertText: "finally:", detail: "終了処理" },
          { label: "return", kind: 14, insertText: "return $0", detail: "関数から値を返す" },
          { label: "break", kind: 14, insertText: "break", detail: "ループを抜ける" },
          { label: "continue", kind: 14, insertText: "continue", detail: "ループをスキップ" },
          { label: "pass", kind: 14, insertText: "pass", detail: "何もしない" },
          { label: "import", kind: 14, insertText: "import $0", detail: "モジュールをインポート" },
          { label: "from", kind: 14, insertText: "from $0 import", detail: "モジュールから要素をインポート" },
          { label: "with", kind: 14, insertText: "with $0:", detail: "コンテキストマネージャー" },
          { label: "as", kind: 14, insertText: "as $0", detail: "エイリアス" },
          { label: "lambda", kind: 14, insertText: "lambda $0:", detail: "匿名関数" },
          { label: "yield", kind: 14, insertText: "yield $0", detail: "ジェネレータ" },
          { label: "assert", kind: 14, insertText: "assert $0", detail: "アサーション" },
          { label: "global", kind: 14, insertText: "global $0", detail: "グローバル変数" },
          { label: "nonlocal", kind: 14, insertText: "nonlocal $0", detail: "外側のスコープ変数" },
          { label: "True", kind: 14, insertText: "True", detail: "真偽値：真" },
          { label: "False", kind: 14, insertText: "False", detail: "真偽値：偽" },
          { label: "None", kind: 14, insertText: "None", detail: "空値" },
          { label: "and", kind: 14, insertText: "and", detail: "論理演算：かつ" },
          { label: "or", kind: 14, insertText: "or", detail: "論理演算：または" },
          { label: "not", kind: 14, insertText: "not", detail: "論理演算：否定" },
          { label: "in", kind: 14, insertText: "in", detail: "メンバーシップテスト" },
          { label: "is", kind: 14, insertText: "is", detail: "同一性テスト" },

          // String メソッド
          { label: ".upper()", kind: 6, insertText: ".upper()", detail: "文字列: 大文字に変換" },
          { label: ".lower()", kind: 6, insertText: ".lower()", detail: "文字列: 小文字に変換" },
          { label: ".strip()", kind: 6, insertText: ".strip()", detail: "文字列: 空白を削除" },
          { label: ".split()", kind: 6, insertText: ".split($0)", detail: "文字列: 分割" },
          { label: ".join()", kind: 6, insertText: ".join($0)", detail: "文字列: 結合" },
          { label: ".replace()", kind: 6, insertText: ".replace($0, $0)", detail: "文字列: 置換" },
          { label: ".startswith()", kind: 6, insertText: ".startswith($0)", detail: "文字列: 開始確認" },
          { label: ".endswith()", kind: 6, insertText: ".endswith($0)", detail: "文字列: 終了確認" },
          { label: ".find()", kind: 6, insertText: ".find($0)", detail: "文字列: 位置を検索" },
          { label: ".count()", kind: 6, insertText: ".count($0)", detail: "文字列: 出現回数を数える" },

          // List メソッド
          { label: ".append()", kind: 6, insertText: ".append($0)", detail: "リスト: 要素を追加" },
          { label: ".extend()", kind: 6, insertText: ".extend($0)", detail: "リスト: 複数の要素を追加" },
          { label: ".insert()", kind: 6, insertText: ".insert($0, $0)", detail: "リスト: 指定位置に挿入" },
          { label: ".remove()", kind: 6, insertText: ".remove($0)", detail: "リスト: 要素を削除" },
          { label: ".pop()", kind: 6, insertText: ".pop($0)", detail: "リスト: 要素を取り出す" },
          { label: ".clear()", kind: 6, insertText: ".clear()", detail: "リスト: すべて削除" },
          { label: ".index()", kind: 6, insertText: ".index($0)", detail: "リスト: インデックスを取得" },
          { label: ".sort()", kind: 6, insertText: ".sort()", detail: "リスト: ソート" },
          { label: ".reverse()", kind: 6, insertText: ".reverse()", detail: "リスト: 逆順に" },
          { label: ".copy()", kind: 6, insertText: ".copy()", detail: "リスト: コピー作成" },
        ];

        return { suggestions: suggestions.map((s) => ({ ...s, range })) };
      },
      triggerCharacters: [".", " ", ""],
    });

    return () => {
      pythonCompletionProvider.dispose();
    };
  }, [monaco]);

  return (
    <Editor
      height={height}
      defaultLanguage="python"
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val || "")}
      options={{
        fontSize: 14,
        tabSize: 4,
        minimap: { enabled: false },
        wordWrap: "on",
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        acceptSuggestionOnEnter: "on",
        snippetSuggestions: "top",
        inlineSuggest: {
          enabled: true,
        },
      }}
    />
  );
};

export default CodeEditor;
