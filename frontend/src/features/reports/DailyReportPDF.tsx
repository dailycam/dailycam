import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// 한글 폰트 등록 (네이버 나눔고딕)
Font.register({
    family: 'NanumGothic',
    src: 'https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Regular.ttf'
});

Font.register({
    family: 'NanumGothicBold',
    src: 'https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Bold.ttf'
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'NanumGothic',
        fontSize: 11,
        lineHeight: 1.6,
        color: '#333'
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#4F46E5', // Indigo-600
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline'
    },
    title: {
        fontFamily: 'NanumGothicBold',
        fontSize: 24,
        color: '#111827' // Gray-900
    },
    date: {
        fontSize: 12,
        color: '#6B7280' // Gray-500
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontFamily: 'NanumGothicBold',
        fontSize: 16,
        color: '#4F46E5',
        marginBottom: 8,
        backgroundColor: '#EEF2FF', // Indigo-50
        padding: 5,
        borderRadius: 4
    },
    content: {
        textAlign: 'justify',
        marginBottom: 10
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 10,
        color: '#9CA3AF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10
    }
});

interface DailyReportPDFProps {
    date: string;
    reportText: string;
}

const DailyReportPDF: React.FC<DailyReportPDFProps> = ({ date, reportText }) => {
    // Markdown 텍스트를 단순 파싱하여 섹션별로 렌더링 (간단 버전)
    // 실제로는 정규식 등으로 ## 헤더를 찾아서 스타일링 적용

    const renderContent = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, index) => {
            // PDF에서는 ** 기호를 단순히 제거하여 깔끔하게 표시
            const cleanLine = line.replace(/\*\*/g, '');

            if (cleanLine.trim().startsWith('## ')) {
                // 섹션 헤더
                return (
                    <View key={index} wrap={false}>
                        {index > 0 && (
                            <View style={{
                                borderBottomWidth: 1,
                                borderBottomColor: '#ccfbef',
                                marginBottom: 10,
                                marginTop: 10
                            }} />
                        )}
                        <Text style={styles.sectionTitle}>
                            {cleanLine.replace('## ', '').trim()}
                        </Text>
                    </View>
                );
            } else if (cleanLine.trim().startsWith('- ')) {
                // 리스트 아이템
                return (
                    <Text key={index} style={{ marginLeft: 10, marginBottom: 2 }}>
                        • {cleanLine.replace('- ', '').trim()}
                    </Text>
                );
            } else if (cleanLine.trim() === '') {
                // 공백
                return <View key={index} style={{ height: 5 }} />;
            } else {
                // 일반 텍스트
                return <Text key={index} style={styles.content}>{cleanLine}</Text>;
            }
        });
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={styles.title}>일일 육아 리포트</Text>
                    <Text style={styles.date}>{date}</Text>
                </View>

                {/* 본문 */}
                <View style={styles.section}>
                    {renderContent(reportText)}
                </View>

                {/* 푸터 */}
                <Text style={styles.footer}>
                    본 리포트는 DailyCam AI System에 의해 분석된 자료입니다.
                    전문가의 진단을 대체할 수 없으며, 참고용으로만 활용해주세요.
                </Text>
            </Page>
        </Document>
    );
};

export default DailyReportPDF;
