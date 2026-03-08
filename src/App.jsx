import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Settings, DollarSign, Globe, Edit2, Check, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// --- 初期設定データ ---
const CURRENCIES = {
  JPY: { symbol: '¥', label: '日本円', locale: 'en-US' },
  GBP: { symbol: '£', label: '英ポンド', locale: 'en-US' },
  USD: { symbol: '$', label: '米ドル', locale: 'en-US' },
  EUR: { symbol: '€', label: 'ユーロ', locale: 'en-US' },
};

const CATEGORIES = [
  { id: 'salary', label: '給与', type: 'income' },
  { id: 'transfer', label: '送金/振替', type: 'income' },
  { id: 'groceries', label: '食費', type: 'expense' },
  { id: 'housing', label: '住居費（家賃等）', type: 'expense' },
  { id: 'utilities', label: '光熱費・通信費', type: 'expense' },
  { id: 'transport', label: '交通費', type: 'expense' },
  { id: 'eating_out', label: '外食・交際費', type: 'expense' },
  { id: 'shopping', label: '日用品・買い物', type: 'expense' },
  { id: 'others', label: 'その他', type: 'expense' },
];

const INITIAL_TRANSACTIONS = [
  { id: '1', date: '2026-03-01', type: 'income', category: 'salary', amount: 2500, currency: 'GBP', memo: '3月分給与' },
  { id: '2', date: '2026-03-02', type: 'expense', category: 'housing', amount: 1200, currency: 'GBP', memo: '家賃' },
  { id: '3', date: '2026-03-03', type: 'expense', category: 'groceries', amount: 45.5, currency: 'GBP', memo: 'Tesco' },
  { id: '4', date: '2026-03-04', type: 'expense', category: 'shopping', amount: 15000, currency: 'JPY', memo: 'Amazon JP (実家宛)' },
  { id: '5', date: '2026-03-05', type: 'income', category: 'transfer', amount: 50000, currency: 'JPY', memo: '立て替え分返済' },
];

export default function App() {
  // --- State ---
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [baseCurrency, setBaseCurrency] = useState('JPY');
  
  // 為替レート（各通貨が何円なのか）
  const [exchangeRates, setExchangeRates] = useState({
    GBP: 190.5,
    JPY: 1,
    USD: 150,
    EUR: 165,
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category: 'groceries',
    amount: '',
    currency: 'GBP',
    customExchangeRate: '',
    memo: ''
  });

  const [showSettings, setShowSettings] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"形式
  const [showCategorySummary, setShowCategorySummary] = useState(false);
  const [categorySummaryType, setCategorySummaryType] = useState('expense'); // 'income' or 'expense'
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  // --- 通貨フォーマット用関数 ---
  const formatCurrency = (amount, currencyCode) => {
    const currency = CURRENCIES[currencyCode];
    if (!currency) return `${amount}`;
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    }).format(amount);
  };

  // --- 基準通貨への換算計算 ---
  const convertToBase = (amount, fromCurrency, customRate) => {
    if (fromCurrency === baseCurrency) return amount;

    const fromRateRaw =
      customRate !== undefined && customRate !== ''
        ? customRate
        : exchangeRates[fromCurrency];

    const fromRate = Number(fromRateRaw);
    const baseRate = Number(exchangeRates[baseCurrency]);

    if (!fromRate || !baseRate) return 0;

    const amountInJPY = amount * fromRate;
    return amountInJPY / baseRate;
  };

  // --- フィルタリング済み取引 ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      const amountInBase = convertToBase(Number(t.amount), t.currency, t.customExchangeRate);
      if (t.type === 'income') {
        income += amountInBase;
      } else {
        expense += amountInBase;
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions, baseCurrency, exchangeRates]);

  // --- 月別サマリー計算 ---
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach(t => {
      const amountInBase = convertToBase(Number(t.amount), t.currency, t.customExchangeRate);
      if (t.type === 'income') {
        income += amountInBase;
      } else {
        expense += amountInBase;
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredTransactions, baseCurrency, exchangeRates]);

  // --- カテゴリ別サマリー計算 ---
  const categorySummary = useMemo(() => {
    const summary = {};

    filteredTransactions.forEach(t => {
      const amountInBase = convertToBase(Number(t.amount), t.currency, t.customExchangeRate);
      const categoryLabel = CATEGORIES.find(c => c.id === t.category)?.label || t.category;
      
      if (!summary[categoryLabel]) {
        summary[categoryLabel] = { income: 0, expense: 0 };
      }
      
      if (t.type === 'income') {
        summary[categoryLabel].income += amountInBase;
      } else {
        summary[categoryLabel].expense += amountInBase;
      }
    });

    return summary;
  }, [filteredTransactions, baseCurrency, exchangeRates]);

  // --- ハンドラー ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      const defaultCategory = CATEGORIES.find(c => c.type === value)?.id || '';
      setFormData(prev => ({ ...prev, type: value, category: defaultCategory }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRateChange = (currency, value) => {
    // 入力中は文字列のまま保持して、空文字も許可する
    setExchangeRates(prev => ({ ...prev, [currency]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(formData.amount)) return;

    const newTx = {
      ...formData,
      id: Date.now().toString(),
      amount: Number(formData.amount)
    };

    setTransactions([newTx, ...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    setFormData(prev => ({
      ...prev,
      amount: '',
      customExchangeRate: '',
      memo: ''
    }));
  };

  const handleDelete = (id) => {
    if (window.confirm('この取引を削除してもよろしいですか？')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleEdit = (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setEditingId(id);
      setEditingData({ ...transaction });
    }
  };

  const handleEditChange = (name, value) => {
    if (name === 'type') {
      const defaultCategory = CATEGORIES.find(c => c.type === value)?.id || '';
      setEditingData(prev => ({ ...prev, type: value, category: defaultCategory }));
    } else {
      setEditingData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdate = () => {
    if (!editingData.amount || isNaN(editingData.amount)) return;

    setTransactions(transactions.map(t => 
      t.id === editingId 
        ? { ...editingData, amount: Number(editingData.amount) }
        : t
    ).sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    setEditingId(null);
    setEditingData({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* ヘッダー */}
      <header className="bg-indigo-900 text-white p-6 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-indigo-300" />
            <div>
              <h1 className="text-2xl font-bold">Budget Board</h1>
              <p className="text-indigo-200 text-sm">多通貨対応 家計簿アプリ</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-indigo-800/50 p-2 rounded-lg border border-indigo-700">
            <span className="text-sm text-indigo-200">基準通貨:</span>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {Object.keys(CURRENCIES).map(code => (
                <option key={code} value={code} className="text-slate-800">{code} ({CURRENCIES[code].label})</option>
              ))}
            </select>
          </div>
        </div>
      </header>

        <main className="max-w-6xl mx-auto p-4 md:p-6 mt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左カラム：入力フォーム＆設定 */}
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                記録
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">収支</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'type', value: 'expense' } })}
                        className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${formData.type === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        支出
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'type', value: 'income' } })}
                        className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${formData.type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        収入
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">日付</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">カテゴリ</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {CATEGORIES.filter(c => c.type === formData.type).map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">通貨</label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {Object.keys(CURRENCIES).map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">金額</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {CURRENCIES[formData.currency].symbol}
                    </span>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="any"
                      min="0"
                      placeholder="0.00"
                      className="w-full p-2 pl-8 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                      required
                    />
                  </div>
                </div>

                {formData.currency !== 'JPY' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">為替レート (任意)</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="customExchangeRate"
                        value={formData.customExchangeRate}
                        onChange={handleInputChange}
                        step="any"
                        min="0"
                        placeholder={`デフォルト: ${exchangeRates[formData.currency]} JPY`}
                        className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-400 ml-1">1 {formData.currency} = ? JPY（未入力時は設定値を使用）</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">メモ (任意)</label>
                  <input
                    type="text"
                    name="memo"
                    value={formData.memo}
                    onChange={handleInputChange}
                    placeholder="お店の名前など"
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  保存する
                </button>
              </form>
            </section>

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between text-slate-600 font-medium hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  為替レート設定
                </div>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {showSettings ? '閉じる' : '編集'}
                </span>
              </button>
              
              {showSettings && (
                <div className="mt-4 space-y-3 pt-4 border-t border-slate-100">
                  {Object.keys(exchangeRates).filter(code => code !== 'JPY').map(code => (
                    <div key={code} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">1 {code} = </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={exchangeRates[code]}
                          onChange={(e) => handleRateChange(code, e.target.value)}
                          step="any"
                          className="w-24 p-1 text-right border border-slate-200 rounded focus:outline-none focus:border-indigo-400"
                        />
                        <span className="w-8 font-bold text-slate-500">JPY</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-2">※ このレートはダッシュボードの換算にのみ使用されます。</p>
                </div>
              )}
            </section>
          </div>

          {/* 右カラム：取引履歴 */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <DollarSign className="w-5 h-5 text-indigo-500" />
                ダッシュボード
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">月を選択：</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <span className="text-sm text-slate-500 whitespace-nowrap">{filteredTransactions.length} 件</span>
              </div>
            </div>

            {/* 月別サマリー */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">月間収支</p>
                <p className="text-xl font-bold text-slate-700">
                  {formatCurrency(filteredSummary.balance, baseCurrency)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">月間収入</p>
                <p className="text-xl font-bold text-emerald-600">+{formatCurrency(filteredSummary.income, baseCurrency)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">月間支出</p>
                <p className="text-xl font-bold text-rose-600">-{formatCurrency(filteredSummary.expense, baseCurrency)}</p>
              </div>
            </div>
            
            {/* 右側：カテゴリ別集計エリア */}
            {/* 上(pt-4)と左(pl-4)に余白を追加 */}
            <div className="space-y-6 pt-4 pl-4">
              <h3 className="text-lg font-bold text-slate-800">カテゴリ別</h3>
              
              {/* 収入・支出選択ボタン */}
              {/* 左に余白をあけた分、バランスを取るために右(pr-4)も指定 */}
              <div className="flex gap-2 justify-center pr-4">
                {['expense', 'income'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setCategorySummaryType(type)}
                    className={`px-4 py-2 rounded text-sm font-medium border ${
                      categorySummaryType === type
                        ? type === 'expense' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {type === 'expense' ? '支出' : '収入'}
                  </button>
                ))}
              </div>

              {/* 円グラフ ＆ 詳細リスト */}
              {Object.values(categorySummary).filter(a => a[categorySummaryType] > 0).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 pr-4">データがありません</p>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8 pr-4">
                  
                  {/* 左側：円グラフ */}
                  {/* 横並びにするため幅を半分(w-1/2)にし、高さを少し抑える(h-[300px]) */}
                  <div className="w-full md:w-1/2 h-[300px] focus:outline-none *:focus:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart style={{ outline: 'none' }}>
                        <Pie
                          style={{ outline: 'none' }}
                          isAnimationActive={false}
                          // 金額が大きい順に並び替えて、リストと色を一致させる
                          data={Object.entries(categorySummary)
                            .filter(([_, a]) => a[categorySummaryType] > 0)
                            .map(([label, amounts]) => ({
                              name: label,
                              value: amounts[categorySummaryType]
                            }))
                            .sort((a, b) => b.value - a.value)}
                          cx="50%"
                          cy="50%"
                          outerRadius={100} // 横並びに合わせて少し小さく調整
                          dataKey="value"
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                            if (percent < 0.05) return null;

                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                              <text
                                x={x}
                                y={y}
                                fill="#ffffff"
                                fontSize="12px"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="central"
                              >
                                {name}
                              </text>
                            );
                          }}
                          stroke="none"
                        >
                          {(categorySummaryType === 'income' 
                            ? ['#22c55e', '#16a34a', '#15803d', '#166534', '#065f46']
                            : ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e']
                          ).map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 右側：カテゴリ別の金額表 */}
                  <div className="w-full md:w-1/2 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest px-1">詳細</div>
                    <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(categorySummary)
                        .filter(([_, a]) => a[categorySummaryType] > 0)
                        .sort((a, b) => b[1][categorySummaryType] - a[1][categorySummaryType]) // 金額順に並び替え
                        .map(([label, amounts], index) => {
                          // 円グラフと同じ順番で色を取得
                          const colors = categorySummaryType === 'income'
                            ? ['#22c55e', '#16a34a', '#15803d', '#166534', '#065f46']
                            : ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'];
                          const dotColor = colors[index % colors.length];

                          return (
                            <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2.5 h-2.5 rounded-sm" 
                                  style={{ backgroundColor: dotColor }}
                                />
                                <span className="text-sm text-slate-600">{label}</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-700 font-mono">
                                {formatCurrency(amounts[categorySummaryType], baseCurrency)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </section>

          {/* 新しいセクション：左にまとめとデータ、右に円グラフ */}
          <section className="col-span-full bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="grid grid-cols-1 gap-6">
              {/* 左側：月間収支まとめと取引データ */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800">収入・支出詳細</h3>
                {/* 月別サマリー */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1">月間収支</p>
                    <p className="text-xl font-bold text-slate-700">
                      {formatCurrency(filteredSummary.balance, baseCurrency)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1">月間収入</p>
                    <p className="text-xl font-bold text-emerald-600">+{formatCurrency(filteredSummary.income, baseCurrency)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1">月間支出</p>
                    <p className="text-xl font-bold text-rose-600">-{formatCurrency(filteredSummary.expense, baseCurrency)}</p>
                  </div>
                </div>
                
                {/* 取引データテーブル */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-medium whitespace-nowrap">日付</th>
                        <th className="px-4 py-2 font-medium whitespace-nowrap">カテゴリ</th>
                        <th className="px-4 py-2 font-medium whitespace-nowrap">メモ</th>
                        <th className="px-4 py-2 text-left whitespace-nowrap">金額 (入力通貨)</th>
                        <th className="px-4 py-2 font-medium text-right whitespace-nowrap">
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
                            {baseCurrency} 換算
                          </span>
                        </th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                            取引データがありません
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const categoryLabel = CATEGORIES.find(c => c.id === tx.category)?.label || tx.category;
                          const isIncome = tx.type === 'income';
                          const amountInBase = convertToBase(tx.amount, tx.currency, tx.customExchangeRate);
                          const isEditing = editingId === tx.id;

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={editingData.date || ''}
                                    onChange={(e) => handleEditChange('date', e.target.value)}
                                    className="w-full text-sm p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                ) : (
                                  tx.date
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <select
                                      value={editingData.type || ''}
                                      onChange={(e) => handleEditChange('type', e.target.value)}
                                      className="text-xs p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      <option value="expense">支出</option>
                                      <option value="income">収入</option>
                                    </select>
                                    <select
                                      value={editingData.category || ''}
                                      onChange={(e) => handleEditChange('category', e.target.value)}
                                      className="text-xs p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      {CATEGORIES.filter(c => c.type === editingData.type).map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {categoryLabel}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingData.memo || ''}
                                    onChange={(e) => handleEditChange('memo', e.target.value)}
                                    placeholder="メモ"
                                    className="w-full text-sm p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                ) : (
                                  tx.memo || '-'
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400 font-bold">
                                      {CURRENCIES[editingData.currency]?.symbol}
                                    </span>
                                    <input
                                      type="number"
                                      value={editingData.amount || ''}
                                      onChange={(e) => handleEditChange('amount', e.target.value)}
                                      step="any"
                                      min="0"
                                      placeholder="0.00"
                                      className="w-20 text-sm p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <select
                                      value={editingData.currency || ''}
                                      onChange={(e) => handleEditChange('currency', e.target.value)}
                                      className="text-xs p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      {Object.keys(CURRENCIES).map(code => (
                                        <option key={code} value={code}>{code}</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className={`font-medium ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <div className="text-slate-800 font-medium">{formatCurrency(convertToBase(editingData.amount || 0, editingData.currency, editingData.customExchangeRate), baseCurrency)}</div>
                                    {editingData.currency !== 'JPY' && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400">レート:</span>
                                        <input
                                          type="number"
                                          value={editingData.customExchangeRate || ''}
                                          onChange={(e) => handleEditChange('customExchangeRate', e.target.value)}
                                          step="any"
                                          min="0"
                                          placeholder={`デフォルト: ${exchangeRates[editingData.currency]}`}
                                          className="w-16 text-xs p-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-slate-800 font-medium">{formatCurrency(amountInBase, baseCurrency)}</div>
                                    {tx.customExchangeRate && (
                                      <div className="text-xs text-slate-400">（1 {tx.currency} = {tx.customExchangeRate}）</div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={handleUpdate}
                                      className="text-emerald-500 hover:text-emerald-700 transition-colors p-1"
                                      title="保存"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                      title="キャンセル"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEdit(tx.id)}
                                      className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                                      title="編集"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(tx.id)}
                                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                      title="削除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
