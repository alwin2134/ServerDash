import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Services from './pages/Services';
import Processes from './pages/Processes';
import Ports from './pages/Ports';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Docker from './pages/Docker';
import History from './pages/History';
import AppStore from './pages/AppStore';
import Timeline from './pages/Timeline';
import Terminal from './pages/Terminal';
import useServerStore from './store/serverStore';

function ProtectedRoute({ children }) {
    const token = useServerStore((s) => s.token);
    if (!token) return <Navigate to="/login" replace />;
    return children;
}

export default function App() {
    return (
        <Routes>
            <Route path="login" element={<Login />} />
            <Route
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="services" element={<Services />} />
                <Route path="processes" element={<Processes />} />
                <Route path="ports" element={<Ports />} />
                <Route path="docker" element={<Docker />} />
                <Route path="apps" element={<AppStore />} />
                <Route path="history" element={<History />} />
                <Route path="timeline" element={<Timeline />} />
                <Route path="terminal" element={<Terminal />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

