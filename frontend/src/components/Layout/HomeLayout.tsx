import { Outlet } from 'react-router-dom';

export default function HomeLayout() {
    return (
        <div className="flex flex-col min-h-screen">
            <Outlet />
        </div>
    );
}
