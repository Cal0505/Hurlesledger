import React, { useState } from 'react';
import { Upload, X, AlertTriangle, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { Member, Transaction } from '../types/budget';
import { formatCurrency } from '../utils/formatters';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currencySymbol: string;
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
}

type ImportStep = 'select' | 'map' | 'preview';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  members,
  currencySymbol,
  onImportTransactions,
}) => {
  const [step, setStep] = useState<ImportStep>('select');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorLog, setErrorLog] = useState<string>('');
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [dateColumnIdx, setDateColumnIdx] = useState<number>(0);
  const [descColumnIdx, setDescColumnIdx] = useState<number>(1);
  const [debitColumnIdx, setDebitColumnIdx] = useState<number>(2);
  const [creditColumnIdx, setCreditColumnIdx] = useState<number>(3);
  const [previewTransactions, setPreviewTransactions] = useState<
    (Omit<Transaction, 'id' | 'createdAt'> & { selected: boolean })[]
  >([]);

  if (!isOpen) return null;

  const cleanCell = (str: string) => {
    if (!str) return '';
    return str.replace(/^["']|["']$/g, '').trim();
  };

  const convertToPostgresDate = (dateStr: string): string => {
    const cleanStr = cleanCell(dateStr);
    if (!cleanStr) return new Date().toISOString().split('T')[0];
    const parts = cleanStr.split(/[-/]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      if (day.length === 4) {
        return `${day}-${month}-${year}`;
      }
      return `${year}-${month}-${day}`;
    }
    return cleanStr;
  };

  const splitCsvLine = (line: string) => {
    const result: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cleanCell(currentCell));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    result.push(cleanCell(currentCell));
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorLog('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text.trim()) {
        setErrorLog('The uploaded spreadsheet file appears to be completely empty.');
        setIsProcessing(false);
        return;
      }
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        setErrorLog('Insufficient rows found. Make sure your sheet contains a header row and data rows.');
        setIsProcessing(false);
        return;
      }
      const parsedHeaders = splitCsvLine(lines[0]);
      const parsedDataRows = lines.slice(1).map(line => splitCsvLine(line));
      setHeaders(parsedHeaders);
      setRawRows(parsedDataRows);
      const lowerHeaders = parsedHeaders.map(h => h.toLowerCase());
      const dIdx = lowerHeaders.findIndex(h => h.includes('date') || h.includes('time'));
      const deIdx = lowerHeaders.findIndex(h =>
        h.includes('desc') || h.includes('name') || h.includes('detail') || h.includes('narrative')
      );
      const dbIdx = lowerHeaders.findIndex(h => h.includes('debit') || h.includes('out') || h.includes('paid out'));
      const crIdx = lowerHeaders.findIndex(h => h.includes('credit') || h.includes('in') || h.includes('paid in'));
      setDateColumnIdx(dIdx !== -1 ? dIdx : 0);
      setDescColumnIdx(deIdx !== -1 ? deIdx : 1);
      setDebitColumnIdx(dbIdx !== -1 ? dbIdx : 2);
      setCreditColumnIdx(crIdx !== -1 ? crIdx : 3);
      setStep('map');
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setErrorLog('Failed to process spreadsheet file configuration.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleGeneratePreview = () => {
    setErrorLog('');
    if (dateColumnIdx === descColumnIdx || debitColumnIdx === creditColumnIdx) {
      setErrorLog('Validation Warning: Core mapping selectors must match unique spreadsheet columns.');
      return;
    }
    try {
      const compiledList = rawRows.map((row) => {
        const maxIdx = Math.max(dateColumnIdx, descColumnIdx, debitColumnIdx, creditColumnIdx);
        if (row.length <= maxIdx) return null;
        const rawDate = row[dateColumnIdx];
        const dateStr = convertToPostgresDate(rawDate);
        const descriptionStr = row[descColumnIdx] || 'Imported Transaction';
        const rawDebit = row[debitColumnIdx].replace(/[$£€,]/g, '').trim();
        const rawCredit = row[creditColumnIdx].replace(/[$£€,]/g, '').trim();
        const debitAmount = parseFloat(rawDebit);
        const creditAmount = parseFloat(rawCredit);
        let finalAmount = 0;
        let txType: 'incoming' | 'outgoing' = 'outgoing';
        if (!isNaN(debitAmount) && debitAmount > 0) {
          finalAmount = debitAmount;
          txType = 'outgoing';
        } else if (!isNaN(creditAmount) && creditAmount > 0) {
          finalAmount = creditAmount;
          txType = 'incoming';
        } else {
          return null;
        }
        return {
          date: dateStr,
          description: descriptionStr,
          amount: finalAmount,
          type: txType,
          category: txType === 'outgoing' ? 'Other Expense' : 'Household Reimbursement',
          source: 'csv-import' as const,
          paymentMethod: 'bank' as const,
          account: 'main',
          selected: true,
        };
      }).filter((t): t is NonNullable<typeof t> => t !== null);

      if (compiledList.length === 0) {
        throw new Error('No valid financial transactions detected. Ensure your Debit or Credit mapping indices match numbers.');
      }
      setPreviewTransactions(compiledList);
      setStep('preview');
    } catch (err) {
      setErrorLog(err instanceof Error ? err.message : 'Failed to generate review ledger structures.');
    }
  };

  const handleSubmitImport = () => {
    setIsProcessing(true);
    setErrorLog('');
    const finalSelection = previewTransactions
      .filter(t => t.selected)
      .map(({ selected, ...rest }) => rest);
    if (finalSelection.length === 0) {
      setErrorLog('Please select at least one transaction to import.');
      setIsProcessing(false);
      return;
    }
    try {
      onImportTransactions(finalSelection);
      setSuccessCount(finalSelection.length);
      setTimeout(() => {
        onClose();
        setStep('select');
        setSuccessCount(null);
      }, 1500);
    } catch (err) {
      setErrorLog('Failed to persist ledger entries inside live database tables.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = previewTransactions.every(t => t.selected);
    setPreviewTransactions(previewTransactions.map(t => ({ ...t, selected: !allSelected })));
  };

  const toggleTransaction = (idx: number) => {
    setPreviewTransactions(previewTransactions.map((t, i) =>
      i === idx ? { ...t, selected: !t.selected } : t
    ));
  };

  return (
    <div className="csv-import-overlay">
      <div className="csv-import-container">
        <div className="csv-import-header">
          <div className="csv-import-title-row">
            <Upload className="csv-import-icon" />
            <h3 className="csv-import-title">Split-Column Bank CSV Importer</h3>
          </div>
          <button type="button" onClick={onClose} className="csv-import-close-btn" aria-label="Close">
            <X className="csv-import-icon" />
          </button>
        </div>

        <div className="csv-import-steps">
          <span className={`step-indicator ${step === 'select' ? 'active' : ''}`}>1. Select File</span>
          <ChevronRight className="csv-import-step-arrow" />
          <span className={`step-indicator ${step === 'map' ? 'active' : ''}`}>2. Map Columns</span>
          <ChevronRight className="csv-import-step-arrow" />
          <span className={`step-indicator ${step === 'preview' ? 'active' : ''}`}>3. Review & Import</span>
        </div>

        <div className="csv-import-content">
          {errorLog && (
            <div role="alert" className="csv-import-error">
              <AlertTriangle className="csv-import-alert-icon" />
              <p>{errorLog}</p>
            </div>
          )}

          {successCount !== null && (
            <div role="status" className="csv-import-success">
              <CheckCircle2 className="csv-import-success-icon" />
              <p>Successfully imported <strong>{successCount}</strong> transaction{successCount !== 1 ? 's' : ''}!</p>
            </div>
          )}

          {step === 'select' && (
            <div className="csv-import-dropzone">
              <FileText className="csv-import-dropzone-icon" />
              <div className="csv-import-dropzone-heading">Select Statement Spreadsheet</div>
              <p className="csv-import-dropzone-subtext">
                Upload your CSV statement to dynamically configure split Debit/Credit layout columns.
              </p>
              <div>
                <label htmlFor="comp-csv-picker" className="csv-import-dropzone-button">
                  Browse Statement Files
                </label>
                <input
                  id="comp-csv-picker"
                  type="file"
                  accept=".csv, text/csv"
                  className="csv-import-sr-only"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="csv-import-map-section">
              <p className="csv-import-map-intro">
                <strong>Configuring 4-Column Array Mapping:</strong> Choose the match parameters for each ledger row below.
              </p>
              <div className="csv-import-map-grid">
                <div>
                  <label className="csv-import-label">Transaction Date</label>
                  <select
                    value={dateColumnIdx}
                    onChange={(e) => setDateColumnIdx(Number(e.target.value))}
                    className="csv-import-select"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>Col {i + 1}: {h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="csv-import-label">Description / Note</label>
                  <select
                    value={descColumnIdx}
                    onChange={(e) => setDescColumnIdx(Number(e.target.value))}
                    className="csv-import-select"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>Col {i + 1}: {h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="csv-import-label">Debit (Money Out)</label>
                  <select
                    value={debitColumnIdx}
                    onChange={(e) => setDebitColumnIdx(Number(e.target.value))}
                    className="csv-import-select csv-import-select--debit"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>Col {i + 1}: {h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="csv-import-label">Credit (Money In)</label>
                  <select
                    value={creditColumnIdx}
                    onChange={(e) => setCreditColumnIdx(Number(e.target.value))}
                    className="csv-import-select csv-import-select--credit"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>Col {i + 1}: {h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="csv-import-actions">
                <button type="button" onClick={() => setStep('select')} className="csv-import-btn csv-import-btn--back">
                  Back
                </button>
                <button type="button" onClick={handleGeneratePreview} className="csv-import-btn csv-import-btn--primary">
                  Generate Table Preview
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="csv-import-preview-section">
              <div className="csv-import-preview-header">
                <span className="csv-import-selected-count">
                  {previewTransactions.filter(t => t.selected).length} rows ready to save
                </span>
                <button type="button" onClick={toggleSelectAll} className="csv-import-toggle-btn">
                  Toggle Select All
                </button>
              </div>
              <div className="csv-import-table-wrapper">
                <table className="csv-import-table">
                  <thead>
                    <tr>
                      <th className="csv-import-th csv-import-th--select"></th>
                      <th className="csv-import-th csv-import-th--date">Date</th>
                      <th className="csv-import-th csv-import-th--desc">Description</th>
                      <th className="csv-import-th csv-import-th--amount">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTransactions.map((tx, idx) => (
                      <tr key={idx} className={`csv-import-row ${tx.selected ? 'csv-import-row--selected' : ''}`}>
                        <td className="csv-import-td csv-import-td--select">
                          <input
                            type="checkbox"
                            checked={tx.selected}
                            onChange={() => toggleTransaction(idx)}
                          />
                        </td>
                        <td className="csv-import-td csv-import-td--date">{tx.date}</td>
                        <td className="csv-import-td csv-import-td--desc">{tx.description}</td>
                        <td className={`csv-import-td csv-import-td--amount ${tx.type === 'incoming' ? 'csv-import-td--incoming' : 'csv-import-td--outgoing'}`}>
                          {tx.type === 'incoming' ? '+' : '-'}{formatCurrency(tx.amount, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="csv-import-actions">
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  className="csv-import-btn csv-import-btn--back"
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitImport}
                  className="csv-import-btn csv-import-btn--confirm"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Saving to Database…' : 'Confirm & Save Transactions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};