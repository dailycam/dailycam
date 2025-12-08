import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface DailyReportResponse {
    date: string;
    report_text: string;
}

export const fetchDailyReport = async (date: string): Promise<DailyReportResponse> => {
    const response = await axios.get(`${API_BASE_URL}/reports/daily-summary`, {
        params: { target_date: date }
    });
    return response.data;
};
