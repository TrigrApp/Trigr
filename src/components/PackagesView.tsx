import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, Trash2, Package as PackageIcon, Search, X, ChevronRight } from "lucide-react";
import { loadPackageData, installPackage, uninstallPackage } from "../utils/packages";
import type { Package } from "../types";

interface PackagesViewProps {
  onSelectPackage: (pkg: Package) => void;
}

export function PackagesView({ onSelectPackage }: PackagesViewProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const { packages, installed } = await loadPackageData();
      setPackages(packages);
      setInstalled(installed);
    } catch (e) {
      console.error("Failed to load packages:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.toLowerCase();
    return packages.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }, [packages, search]);

  async function handleInstall(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await installPackage(id);
      setInstalled((prev) => new Set(prev).add(id));
    } catch (e) {
      console.error("Install failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUninstall(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await uninstallPackage(id);
      setInstalled((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      console.error("Uninstall failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="view-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1>Packages</h1>
        <p>Install trigger packages for common content</p>
      </div>

      <div className="search-bar">
        <Search size={14} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packages..."
          className="search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")}>
            <X size={12} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No packages found</h3>
          <p>{search ? "Try a different search term" : "Check back later for new packages"}</p>
        </div>
      ) : (
        <div className="package-grid">
          {filtered.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${installed.has(pkg.id) ? "installed" : ""}`}
              onClick={() => onSelectPackage(pkg)}
            >
              <div className="package-card-content">
                <div className="package-icon">
                  <PackageIcon size={28} />
                </div>
                <div className="package-info">
                  <div className="package-header">
                    <h3>{pkg.name}</h3>
                    <span className="package-version">v{pkg.version}</span>
                  </div>
                  <p className="package-desc">{pkg.description}</p>
                  <span className="package-count">{pkg.triggers.length} triggers</span>
                </div>
                <ChevronRight size={16} className="package-chevron" />
              </div>
              <div className="package-card-actions" onClick={(e) => e.stopPropagation()}>
                {installed.has(pkg.id) ? (
                  <button className="btn-small btn-danger" onClick={(e) => handleUninstall(pkg.id, e)} disabled={actionLoading === pkg.id}>
                    <Trash2 size={12} />
                    Remove
                  </button>
                ) : (
                  <button className="btn-small btn-primary" onClick={(e) => handleInstall(pkg.id, e)} disabled={actionLoading === pkg.id}>
                    <Download size={12} />
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PackageDetailViewProps {
  pkg: Package;
  onBack: () => void;
}

export function PackageDetailView({ pkg, onBack }: PackageDetailViewProps) {
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkInstalled = async () => {
      try {
        const data = await loadPackageData();
        setInstalled(data.installed.has(pkg.id));
      } catch (e) {
        console.error("Failed to check installed status:", e);
      } finally {
        setLoading(false);
      }
    };
    checkInstalled();
  }, [pkg.id]);

  async function handleInstall() {
    try {
      await installPackage(pkg.id);
      setInstalled(true);
    } catch (e) {
      console.error("Install failed:", e);
    }
  }

  async function handleUninstall() {
    try {
      await uninstallPackage(pkg.id);
      setInstalled(false);
    } catch (e) {
      console.error("Uninstall failed:", e);
    }
  }

  if (loading) {
    return <div className="view-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="view-container">
      <div className="view-header view-header-row">
        <div className="view-header-text">
          <button className="back-btn" onClick={onBack}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            Back
          </button>
          <h1>{pkg.name}</h1>
          <p className="view-subtitle">{pkg.description}</p>
        </div>
        <div className="view-header-actions">
          {installed ? (
            <button className="btn btn-danger" onClick={handleUninstall}>
              <Trash2 size={14} />
              Remove Package
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleInstall}>
              <Download size={14} />
              Install Package
            </button>
          )}
        </div>
      </div>

      <div className="package-detail-info">
        <span className="package-version">v{pkg.version}</span>
        <span className="package-count">{pkg.triggers.length} triggers</span>
      </div>

      <div className="package-detail-section">
        <h4>Triggers</h4>
        <div className="package-triggers-list">
          {pkg.triggers.map((trigger, i) => (
            <div key={i} className="package-trigger-row">
              <code className="trigger-text">{trigger.trigger_text}</code>
              <span className="trigger-arrow">→</span>
              <span className="trigger-replacement">{trigger.replacement}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}