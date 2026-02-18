
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  IntensityLevel, 
  InvoiceItem, 
  BusinessInfo, 
  CustomerInfo, 
  InvoiceDetails,
  LetterData,
  SubscriptionStatus
} from './types';
import { Icons } from './constants';
import { generateCollectionsLetter } from './services/geminiService';
import { jsPDF } from 'jspdf';

const LOCAL_STORAGE_KEY = 'collectease_profile';
const RECENT_DEBTORS_KEY = 'collectease_recent_debtors';

const App: React.FC = () => {
  // Persistence Loading
  const loadProfile = (): BusinessInfo => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      name: '',
      address: '',
      state: '',
      phone: '',
      email: '',
      website: ''
    };
  };

  const loadRecentDebtors = (): CustomerInfo[] => {
    const saved = localStorage.getItem(RECENT_DEBTORS_KEY);
    return saved ? JSON.parse(saved) : [];
  };

  // State
  const [business, setBusiness] = useState<BusinessInfo>(loadProfile());
  const [recentDebtors, setRecentDebtors] = useState<CustomerInfo[]>(loadRecentDebtors());
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    address: '',
    contactPerson: ''
  });

  const [invoice, setInvoice] = useState<InvoiceDetails>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    originalDueDate: '',
    newDeadline: '',
    items: [{ id: '1', description: '', amount: 0 }],
    lateFees: 0,
    paymentInstructions: 'Please pay online via the link provided or send a check to our mailing address.',
    paymentLink: '',
    paymentPhone: ''
  });

  const [intensity, setIntensity] = useState<IntensityLevel>(IntensityLevel.FRIENDLY);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(business));
  }, [business]);

  useEffect(() => {
    localStorage.setItem(RECENT_DEBTORS_KEY, JSON.stringify(recentDebtors));
  }, [recentDebtors]);

  // Handlers
  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', amount: 0 }]
    }));
  };

  const removeItem = (id: string) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleGenerate = async () => {
    if (!business.name || !customer.name) {
      alert("Please enter both your business name and the customer name.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const letterData: LetterData = { business, customer, invoice, intensity };
      const result = await generateCollectionsLetter(letterData);
      setGeneratedLetter(result);
      
      // Save to recent debtors if not already there
      setRecentDebtors(prev => {
        const filtered = prev.filter(d => d.name !== customer.name);
        return [customer, ...filtered].slice(0, 5);
      });
    } catch (error) {
      alert("Failed to generate letter.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const splitText = doc.splitTextToSize(generatedLetter, pageWidth - margin * 2);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(splitText, margin, 25);
    
    doc.save(`Collections_Letter_${invoice.invoiceNumber || 'Draft'}.pdf`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const selectDebtor = (debtor: CustomerInfo) => {
    setCustomer(debtor);
  };

  const totalAmount = useMemo(() => {
    return invoice.items.reduce((sum, item) => sum + item.amount, 0) + (invoice.lateFees || 0);
  }, [invoice.items, invoice.lateFees]);

  return (
    <div className="min-h-screen pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Icons.Sparkles />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CollectEase</h1>
          </div>
          <div className="flex items-center space-x-4">
             <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full font-semibold transition-all shadow-lg ${
                isGenerating 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
              }`}
            >
              {isGenerating ? (
                <span className="animate-pulse">Generating...</span>
              ) : (
                <>
                  <Icons.Sparkles />
                  <span>Generate Letter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:grid lg:grid-cols-2 lg:gap-10">
        
        {/* LEFT SIDE: INPUTS */}
        <div className="space-y-6 no-print overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
          
          {/* Subscription / Monetization Card */}
          {!isPremium && (
            <section className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold mb-1">Upgrade to Premium</h3>
                  <p className="text-indigo-100 text-sm mb-4">Unlock PDF downloads, unlimited letters, and legal tone tuning.</p>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setIsPremium(true)}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors"
                    >
                      $19.99/mo
                    </button>
                    <button 
                      onClick={() => setIsPremium(true)}
                      className="bg-indigo-500/30 border border-white/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors"
                    >
                      $9.99 One-time
                    </button>
                  </div>
                </div>
                <div className="opacity-30">
                  <Icons.Sparkles />
                </div>
              </div>
            </section>
          )}

          {/* Intensity Selection */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">1</span>
              <span>Letter Intensity</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(IntensityLevel).map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(level)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                    intensity === level 
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500 italic">
              {intensity === IntensityLevel.FRIENDLY && "Soft reminder, focusing on the relationship."}
              {intensity === IntensityLevel.FIRM && "Direct approach, mentioning late fees and deadlines."}
              {intensity === IntensityLevel.FINAL && "Urgent warning of attorney referral/collections."}
            </p>
          </section>

          {/* Business Info (Profile) */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
             <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Autosaved Profile</span>
             </div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">2</span>
              <span>Your Business Profile</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company Name</label>
                <input 
                  placeholder="e.g. Acme Solutions Inc."
                  value={business.name}
                  onChange={(e) => setBusiness({...business, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mailing Address</label>
                <textarea 
                  rows={2}
                  placeholder="Street, City, Zip"
                  value={business.address}
                  onChange={(e) => setBusiness({...business, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">State / Jurisdiction</label>
                <input 
                  placeholder="e.g. California"
                  value={business.state}
                  onChange={(e) => setBusiness({...business, state: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Phone</label>
                <input 
                  value={business.phone}
                  onChange={(e) => setBusiness({...business, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Customer Info & History */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">3</span>
              <span>Debtor / Customer Details</span>
            </h2>
            
            {recentDebtors.length > 0 && (
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Quick Select Recent</label>
                <div className="flex flex-wrap gap-2">
                  {recentDebtors.map((d, i) => (
                    <button 
                      key={i} 
                      onClick={() => selectDebtor(d)}
                      className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors border border-transparent hover:border-indigo-200"
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Customer / Company Name</label>
                <input 
                  placeholder="Who owes the balance?"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Attention To (Contact Person)</label>
                <input 
                  placeholder="e.g. Accounts Payable"
                  value={customer.contactPerson}
                  onChange={(e) => setCustomer({...customer, contactPerson: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Customer Mailing Address</label>
                <textarea 
                  rows={2}
                  value={customer.address}
                  onChange={(e) => setCustomer({...customer, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Invoice Details */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">4</span>
              <span>Debt Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Invoice Number</label>
                <input 
                  placeholder="e.g. INV-1001"
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice({...invoice, invoiceNumber: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Original Due Date</label>
                <input 
                  type="date"
                  value={invoice.originalDueDate}
                  onChange={(e) => setInvoice({...invoice, originalDueDate: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Final Deadline</label>
                <input 
                  type="date"
                  value={invoice.newDeadline}
                  onChange={(e) => setInvoice({...invoice, newDeadline: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-amber-400 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
            </div>

            {/* Itemized Charges */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Itemized Charges</label>
                <button onClick={addItem} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center space-x-1">
                  <Icons.Plus />
                  <span>Add Item</span>
                </button>
              </div>
              <div className="space-y-2">
                {invoice.items.map((item) => (
                  <div key={item.id} className="flex space-x-2">
                    <input 
                      placeholder="e.g. Consulting Services"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                      <input 
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Late Fees ($)</label>
                <input 
                  type="number"
                  value={invoice.lateFees}
                  onChange={(e) => setInvoice({...invoice, lateFees: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex flex-col justify-end items-end">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Amount</span>
                <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* CTA & Payment Fields */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">5</span>
              <span>Call to Action Details</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Link (Optional)</label>
                <input 
                  placeholder="https://pay.example.com/..."
                  value={invoice.paymentLink || ''}
                  onChange={(e) => setInvoice({...invoice, paymentLink: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Help Phone</label>
                <input 
                  placeholder="For credit card processing help"
                  value={invoice.paymentPhone || ''}
                  onChange={(e) => setInvoice({...invoice, paymentPhone: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">General Payment Instructions</label>
                <textarea 
                  rows={3}
                  value={invoice.paymentInstructions}
                  onChange={(e) => setInvoice({...invoice, paymentInstructions: e.target.value})}
                  placeholder="e.g. Check by mail, online portal, or wire transfer..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT SIDE: PREVIEW */}
        <div className="mt-10 lg:mt-0 relative">
          <div className="sticky top-24">
            <div className="flex justify-between items-center mb-4 no-print">
              <h3 className="text-lg font-bold text-slate-900">Letter Preview</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={handleCopy}
                  className={`p-2 rounded-lg border transition-all ${copySuccess ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  title="Copy to Clipboard"
                >
                  {copySuccess ? <Icons.Check /> : <Icons.Copy />}
                </button>
                {isPremium ? (
                  <button 
                    onClick={handleDownloadPDF}
                    className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all flex items-center space-x-2"
                    title="Export to PDF"
                  >
                    <Icons.Download />
                    <span className="text-xs font-bold pr-1">PDF</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => alert("Upgrade to Premium to export clean PDFs!")}
                    className="p-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed flex items-center space-x-2"
                    title="PDF Export (Premium Only)"
                  >
                    <Icons.Download />
                    <span className="text-[10px] font-bold pr-1">PREMIUM</span>
                  </button>
                )}
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all"
                  title="Print"
                >
                  <Icons.Printer />
                </button>
              </div>
            </div>

            <div className="bg-white p-8 sm:p-12 border border-slate-200 shadow-xl rounded-sm min-h-[600px] letter-container whitespace-pre-wrap font-serif text-slate-800 leading-relaxed overflow-y-auto max-h-[calc(100vh-200px)]">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-sans animate-pulse">Drafting your {intensity.toLowerCase()} in {business.state || 'default'} jurisdiction...</p>
                </div>
              ) : generatedLetter ? (
                <div className="prose prose-slate max-w-none prose-p:my-2 prose-h1:text-xl prose-h1:font-sans prose-h1:font-bold prose-h1:uppercase prose-h1:tracking-wide">
                  {generatedLetter}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4 px-8">
                  <div className="p-4 bg-slate-50 rounded-full">
                    <Icons.Sparkles />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-slate-900">No Content Generated</h4>
                    <p className="font-sans text-sm text-slate-500 max-w-xs mt-1">Fill out the details and click "Generate Letter" to see your professional collections draft here.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Print Footer Attribution - only visible during print */}
            <div className="hidden print:block fixed bottom-0 left-0 right-0 text-center text-[10px] text-slate-400 py-4 border-t">
              Generated via CollectEase Small Business Collections Writer • {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-6 right-6 lg:hidden no-print">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center space-x-2"
        >
          {isGenerating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Icons.Sparkles />}
          <span className="font-bold pr-2">Generate</span>
        </button>
      </div>
    </div>
  );
};

export default App;
