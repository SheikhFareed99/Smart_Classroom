import "./Dashboard.css";
import { ThemeProvider } from "../components/ThemeToggle";
import ThemeToggle from "../components/ThemeToggle";


function Dashboard() {
  return (
    <ThemeProvider>
          {/*dark mode toggle button*/}
          <ThemeToggle className="login-toggle" />
    <div className="dashboard-container">
    
      <h1 className="welcome-text">Successfully Logged In</h1>
    </div>
    </ThemeProvider>

    
  );
}

export default Dashboard;
