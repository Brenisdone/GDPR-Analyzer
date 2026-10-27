import { useState } from "react";

import Navbar from "./components/Navbar/Navbar";
import Workspace from "./pages/Workspace";
import Documentation from "./pages/Documentation";

function App() {
  const [view, setView] = useState("workspace");

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <Navbar activeView={view} onChange={setView} />

      {/* Both stay mounted so scan state survives switching views */}
      <div className={view === "workspace" ? "" : "hidden"}>
        <Workspace />
      </div>
      <div className={view === "documentation" ? "" : "hidden"}>
        <Documentation />
      </div>
    </div>
  );
}

export default App;