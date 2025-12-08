import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';

export interface DailyReportResponse {
    date: string;
    report_text: string;
}

export const fetchDailyReport = async (date: string): Promise<DailyReportResponse> => {
    const response = await axios.get(`${API_BASE_URL}/api/reports/daily-summary`, {
        params: { target_date: date }
    });
    return response.data;
};
