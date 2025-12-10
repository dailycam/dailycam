import React, { useEffect, useState } from 'react';
import { X, Calendar, Download, AlertCircle, Loader2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import DailyReportPDF from './DailyReportPDF';
import { fetchDailyReport } from '../../api/reportApi';

interface DailyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string; // YYYY-MM-DD
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose, date }) => {
    const [reportText, setReportText] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadReport();
        }
    }, [isOpen, date]);

    const loadReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDailyReport(date);
            setReportText(data.report_text);
        } catch (err) {
            setError("리포트를 생성하는 중 문제가 발생했습니다. (데이터가 없을 수도 있습니다)");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Markdown 스타일의 텍스트를 HTML로 렌더링 (간단 변환 + 볼드 처리)
    const parseBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g); // **...** 패턴으로 분리
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const renderHTMLContent = (text: string) => {
        return text.split('\n').map((line, idx) => {
            if (line.trim().startsWith('##')) {
                const title = line.replace(/^##\s*/, '').trim();
                return (
                    <React.Fragment key={idx}>
                        {idx > 0 && <hr className="border-t border-primary-100 my-6" />}
                        <h3 className="text-xl font-bold text-primary-700 mt-6 mb-3 bg-indigo-50 p-2 rounded">{title}</h3>
                    </React.Fragment>
                );
            } else if (line.startsWith('- ')) {
                return <li key={idx} className="ml-4 mb-1 text-gray-700 list-disc">{parseBold(line.replace('- ', ''))}</li>;
            } else if (line.trim() === '') {
                return <div key={idx} className="h-2"></div>;
            } else {
                return <p key={idx} className="mb-2 text-gray-800 leading-relaxed text-justify">{parseBold(line)}</p>;
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">일일 육아 리포트</h2>
                            <p className="text-sm text-gray-500">{date}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                            <p className="text-gray-500 font-medium animate-pulse">AI 전문가가 리포트를 작성 중입니다...</p>
                            <p className="text-xs text-gray-400">(약 5~10초 소요)</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                            <div className="p-3 bg-red-50 rounded-full mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-gray-900 font-semibold mb-1">앗! 리포트를 불러오지 못했어요</p>
                            <p className="text-gray-500 text-sm mb-4">{error}</p>
                            <button
                                onClick={loadReport}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                다시 시도하기
                            </button>
                        </div>
                    ) : (
                        <div className="prose prose-indigo max-w-none">
                            {/* 뷰어용 HTML 렌더링 */}
                            {renderHTMLContent(reportText)}
                        </div>
                    )}
                </div>

                {/* Footer (Actions) */}
                {!loading && !error && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            닫기
                        </button>

                        {/* PDF 다운로드 버튼 (React-PDF) */}
                        <PDFDownloadLink
                            document={<DailyReportPDF date={date} reportText={reportText} />}
                            fileName={`DailyCam_Report_${date}.pdf`}
                            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-200 flex items-center gap-2 transition-transform active:scale-95"
                        >
                            {({ loading: pdfLoading }) => (
                                <>
                                    {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {pdfLoading ? 'PDF 생성 중...' : 'PDF로 소장하기'}
                                </>
                            )}
                        </PDFDownloadLink>
                    </div>
                )}
            </div>
        </div>
    );
};
