import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import useWebSocket from '../hooks/useWebSocket';
import useServerData from '../hooks/useServerData';

export default function Layout() {
    useWebSocket();
    useServerData();

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TopBar />
                <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px 48px' }}>
                    <Outlet />
                </main>
            </div>
            <CommandPalette />
        </div>
    );
}
