import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ChangeEvent,
  DragEvent,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  Zap,
} from "lucide-react";

import Auth from "./Auth";

/* =========================================================
   TYPES
========================================================= */

type Issue = {
  type?: string;
  severity?: string;
  column?: string;
  row?: number;
  message?: string;
};

type ValidationResult = {
  errors: Issue[];
  warnings: Issue[];
};

type RiskResult = {
  risk_score: number;
  risk_level: string;
};

type AnalysisResponse = {
  message?: string;
  detail?: string;
  report_id?: number;
  filename?: string;
  file_type?: string;
  validation?: ValidationResult | null;
  risk?: RiskResult | null;

  /*
   * unknown is intentional.
   * Groq/backend can return either a string
   * or a structured object.
   */
  ai_compliance_assistant?: unknown;
};

type Report = {
  id: number;
  filename: string;
  status: string;
  risk_score: number;
  risk_level: string;
  created_at?: string;
};

type FilterType =
  | "all"
  | "errors"
  | "warnings";

type UserData = {
  name: string;
  email: string;
};

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  "http://127.0.0.1:8000";

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  /* =======================================================
     AUTH
  ======================================================= */

  const [isAuthenticated, setIsAuthenticated] =
    useState(
      Boolean(
        localStorage.getItem("token")
      )
    );

  const [currentUser, setCurrentUser] =
    useState<UserData | null>(() => {
      const savedUser =
        localStorage.getItem("user");

      if (!savedUser) {
        return null;
      }

      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    });

  /* =======================================================
     FILE / ANALYSIS STATE
  ======================================================= */

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isDragging, setIsDragging] =
    useState(false);

  const [isUploading, setIsUploading] =
    useState(false);

  const [uploadMessage, setUploadMessage] =
    useState("");

  const [uploadError, setUploadError] =
    useState("");

  const [analysis, setAnalysis] =
    useState<AnalysisResponse | null>(
      null
    );

  const [reports, setReports] =
    useState<Report[]>([]);

  const [isLoadingReports, setIsLoadingReports] =
    useState(false);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [showAI, setShowAI] =
    useState(true);

  const [showHistory, setShowHistory] =
    useState(false);

  const [selectedReport, setSelectedReport] =
    useState<any>(null);

  const [loadingReportDetails, setLoadingReportDetails] =
    useState(false);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsAuthenticated(false);
    setCurrentUser(null);

    setAnalysis(null);
    setReports([]);
    setSelectedFile(null);
    setSelectedReport(null);

    setUploadMessage("");
    setUploadError("");
  }, []);

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = (
    token: string,
    user: UserData
  ) => {
    localStorage.setItem(
      "token",
      token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const errors =
    analysis?.validation?.errors ?? [];

  const warnings =
    analysis?.validation?.warnings ?? [];

  const riskScore =
    analysis?.risk?.risk_score ?? 0;

  const riskLevel =
    analysis?.risk?.risk_level ??
    "No Analysis";

  const aiResponse =
    analysis?.ai_compliance_assistant ??
    "Upload a report to receive AI-powered compliance insights.";

  /* =======================================================
     FILTERED ISSUES
  ======================================================= */

  const filteredIssues = useMemo(() => {
    if (filter === "errors") {
      return errors;
    }

    if (filter === "warnings") {
      return warnings;
    }

    return [
      ...errors,
      ...warnings,
    ];
  }, [
    errors,
    warnings,
    filter,
  ]);

  /* =======================================================
     FETCH REPORTS
  ======================================================= */

  const fetchReports = useCallback(
    async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        return;
      }

      try {
        setIsLoadingReports(true);

        const response =
          await fetch(
            `${API_BASE_URL}/reports`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (
          response.status === 401
        ) {
          handleLogout();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to fetch reports."
          );
        }

        const data =
          await response.json();

        setReports(
          data.reports ?? []
        );
      } catch (error) {
        console.error(
          "Reports error:",
          error
        );
      } finally {
        setIsLoadingReports(false);
      }
    },
    [handleLogout]
  );

  /* =======================================================
     FETCH REPORT DETAILS
  ======================================================= */

  const fetchReportDetails = async (
    reportId: number
  ) => {
    try {
      setLoadingReportDetails(true);

      const token =
        localStorage.getItem("token");

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/reports/${reportId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to fetch report details."
        );
      }

      const data = await response.json();

      setSelectedReport(data);
    } catch (error) {
      console.error(
        "Report details error:",
        error
      );
    } finally {
      setLoadingReportDetails(false);
    }
  };

  /* =======================================================
     FETCH REPORTS AFTER LOGIN
  ======================================================= */

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [
    isAuthenticated,
    fetchReports,
  ]);

  /* =======================================================
     FILE SELECT
  ======================================================= */

  const handleFileSelect = (
    file: File
  ) => {
    setUploadError("");
    setUploadMessage("");

    const allowedExtensions = [
      ".pdf",
      ".csv",
      ".xlsx",
    ];

    const extension =
      file.name
        .substring(
          file.name.lastIndexOf(".")
        )
        .toLowerCase();

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      setSelectedFile(null);

      setUploadError(
        "Unsupported file type. Please upload PDF, CSV or XLSX."
      );

      return;
    }

    setSelectedFile(file);
  };

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };

  /* =======================================================
     DRAG DROP
  ======================================================= */

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };

  /* =======================================================
     UPLOAD REPORT
  ======================================================= */

  const uploadReport = async () => {
    if (!selectedFile) {
      setUploadError(
        "Please select a report first."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      setUploadError(
        "Please login first."
      );

      handleLogout();
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      selectedFile
    );

    try {
      setIsUploading(true);
      setUploadError("");
      setUploadMessage("");

      const response =
        await fetch(
          `${API_BASE_URL}/upload-report`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ??
            data.message ??
            "Report analysis failed."
        );
      }

      setAnalysis(data);

      setUploadMessage(
        `Report analyzed successfully. Risk Score: ${
          data.risk?.risk_score ?? 0
        }/100`
      );

      await fetchReports();
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      setUploadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while analyzing the report."
      );
    } finally {
      setIsUploading(false);
    }
  };

  /* =======================================================
     DELETE REPORT
  ======================================================= */

  const deleteReport = async (
    reportId: number
  ) => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      handleLogout();
      return;
    }

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/reports/${reportId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (
        response.status === 401
      ) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to delete report."
        );
      }

      setReports(
        (previous) =>
          previous.filter(
            (report) =>
              report.id !==
              reportId
          )
      );
    } catch (error) {
      console.error(
        "Delete error:",
        error
      );

      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to delete report."
      );
    }
  };

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  if (!isAuthenticated) {
    return (
      <Auth
        onLogin={handleLogin}
      />
    );
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090D16] text-white">

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />

        <div className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[140px]" />

        <div className="absolute bottom-[-250px] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[140px]" />

      </div>

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="relative z-30 border-b border-white/[0.07] bg-[#090D16]/80 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={21} />
            </div>

            <div>
              <p className="font-semibold">
                ReguTrack
              </p>

              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                Compliance Intelligence
              </p>
            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-400 sm:flex">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              API Healthy

            </div>

            <button
  onClick={() => {
    setShowHistory(true);

    setTimeout(() => {
      document
        .getElementById("report-history")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }}
  className="hidden rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] sm:block"
>
 Past Reports
</button>

            <div className="hidden items-center gap-2 md:flex">

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-indigo-300">
                <User size={15} />
              </div>

              <div className="hidden lg:block">

                <p className="max-w-28 truncate text-xs font-medium text-slate-200">
                  {currentUser?.name ??
                    "User"}
                </p>

                <p className="max-w-32 truncate text-[9px] text-slate-600">
                  {currentUser?.email ??
                    ""}
                </p>

              </div>

            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-400 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
            >
              <LogOut size={14} />

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>

          </div>

        </div>

      </nav>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="flex flex-col items-center text-center">

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mb-7 flex items-center gap-2 rounded-full border border-indigo-400/10 bg-indigo-500/5 px-4 py-2 text-xs text-indigo-300"
          >
            <Sparkles size={14} />

            Intelligent Regulatory Monitoring
          </motion.div>

          <motion.h1
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
            }}
            className="max-w-5xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl md:text-7xl"
          >
            Compliance intelligence,

            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              without the complexity.
            </span>
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
            className="mt-7 max-w-3xl text-base leading-7 text-slate-400 md:text-lg"
          >
            Upload regulatory reports,
            detect data-quality issues,
            calculate explainable
            compliance risk, and receive
            AI-powered explanations and
            corrective actions.
          </motion.p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">

            <StatusPill
              icon={
                <ShieldCheck size={12} />
              }
              text="Rule Engine Active"
            />

            <StatusPill
              icon={<Bot size={12} />}
              text="AI Assistant Ready"
            />

            <StatusPill
              icon={
                <Activity size={12} />
              }
              text="System Operational"
            />

          </div>

        </section>

        {/* =================================================
            METRICS
        ================================================= */}

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <MetricCard
            icon={
              <ShieldCheck size={18} />
            }
            title="Compliance Status"
            value={
              analysis
                ? riskLevel
                : "Awaiting Report"
            }
            detail={
              analysis
                ? "Latest analysis"
                : "Upload a report"
            }
          />

          <MetricCard
            icon={
              <FileCheck2 size={18} />
            }
            title="Reports Processed"
            value={String(
              reports.length
            )}
            detail="Your workspace"
          />

          <MetricCard
            icon={
              <AlertTriangle
                size={18}
              />
            }
            title="Issues Detected"
            value={String(
              errors.length +
                warnings.length
            )}
            detail="Latest report"
          />

          <MetricCard
            icon={
              <Activity size={18} />
            }
            title="System Status"
            value="Operational"
            detail="All services running"
          />

        </section>

        {/* =================================================
            UPLOAD + AI
        ================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* =================================================
              UPLOAD CARD
          ================================================= */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.25,
            }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl"
          >

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm font-medium">
                  Analyze a Report
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Upload a regulatory or
                  financial report
                </p>

              </div>

              <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
                <Upload size={18} />
              </div>

            </div>

            {/* DROP ZONE */}

            <motion.div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => {
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              animate={{
                borderColor: isDragging
                  ? "rgba(99,102,241,0.7)"
                  : "rgba(255,255,255,0.1)",
              }}
              className={`relative mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed transition-all duration-300 ${
                isDragging
                  ? "bg-indigo-500/[0.07] shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                  : "bg-black/10 hover:bg-indigo-500/[0.025]"
              }`}
            >

              <input
                type="file"
                accept=".pdf,.csv,.xlsx"
                onChange={
                  handleInputChange
                }
                className="absolute inset-0 z-10 cursor-pointer opacity-0"
              />

              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400"
              >
                <Upload size={25} />
              </motion.div>

              {selectedFile ? (
                <>
                  <p className="max-w-[80%] truncate text-sm font-medium text-white">
                    {selectedFile.name}
                  </p>

                  <p className="mt-2 text-xs text-emerald-400">
                    Report selected
                    successfully
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-200">
                    Drop your report here
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    or click to browse files
                  </p>
                </>
              )}

              <div className="mt-4 flex gap-2">

                <FormatBadge text="PDF" />
                <FormatBadge text="CSV" />
                <FormatBadge text="XLSX" />

              </div>

              {selectedFile && (
                <motion.button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    uploadReport();
                  }}
                  disabled={isUploading}
                  whileHover={{
                    scale: 1.03,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  className="relative z-20 mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-medium shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {isUploading ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />

                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />

                      Analyze Report
                    </>
                  )}

                </motion.button>
              )}

            </motion.div>

            {/* ERROR */}

            <AnimatePresence>
              {uploadError && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -5,
                  }}
                  className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300"
                >

                  <AlertCircle
                    size={15}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {uploadError}
                  </span>

                </motion.div>
              )}
            </AnimatePresence>

            {/* SUCCESS */}

            <AnimatePresence>
              {uploadMessage &&
                !uploadError && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300"
                  >

                    <CheckCircle2
                      size={15}
                    />

                    {uploadMessage}

                  </motion.div>
                )}
            </AnimatePresence>

          </motion.div>

          {/* =================================================
              AI ASSISTANT
          ================================================= */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.35,
            }}
            className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6 backdrop-blur-xl"
          >

            <div className="absolute right-[-70px] top-[-70px] h-52 w-52 rounded-full bg-purple-500/10 blur-[80px]" />

            <div className="relative flex h-full flex-col">

              {/* AI HEADER */}

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                    <Bot size={20} />
                  </div>

                  <div>

                    <p className="text-sm font-semibold">
                      ReguTrack AI
                    </p>

                    <p className="text-xs text-indigo-300/70">
                      Compliance Assistant
                    </p>

                  </div>

                </div>

                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] text-indigo-300">
                  AI POWERED
                </span>

              </div>

              {/* AI CONTENT */}

              <div className="mt-7 flex-1 rounded-xl border border-white/[0.06] bg-black/10 p-5">

                <div className="flex items-center gap-2">

                  <Sparkles
                    size={15}
                    className="text-indigo-400"
                  />

                  <span className="text-xs text-slate-300">
                    Compliance Analysis
                  </span>

                </div>

                <AnimatePresence mode="wait">

                  {showAI ? (
                    <motion.div
                      key="ai-visible"
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                      }}
                      className="mt-4 max-h-[420px] overflow-y-auto pr-2"
                    >
                      <AIResponse
                        response={
                          aiResponse
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ai-hidden"
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      className="mt-4 flex min-h-32 items-center justify-center text-xs text-slate-600"
                    >
                      AI analysis hidden
                    </motion.div>
                  )}

                </AnimatePresence>

              </div>

              {/* AI TOGGLE */}

              <button
                onClick={() =>
                  setShowAI(!showAI)
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.06]"
              >

                <Bot size={16} />

                {showAI
                  ? "Hide AI Analysis"
                  : "Show AI Analysis"}

              </button>

            </div>

          </motion.div>

        </section>

        {/* =================================================
            PIPELINE
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl">

          <div>

            <p className="text-sm font-medium">
              Compliance Processing Pipeline
            </p>

            <p className="mt-1 text-xs text-slate-500">
              From raw report to intelligent
              compliance insight
            </p>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

            <PipelineStep
              number="01"
              icon={
                <Upload size={15} />
              }
              text="Upload"
            />

            <PipelineStep
              number="02"
              icon={
                <FileText size={15} />
              }
              text="Process"
            />

            <PipelineStep
              number="03"
              icon={
                <ShieldCheck size={15} />
              }
              text="Validate"
            />

            <PipelineStep
              number="04"
              icon={
                <Activity size={15} />
              }
              text="Risk Analysis"
            />

            <PipelineStep
              number="05"
              icon={
                <Bot size={15} />
              }
              text="AI Insights"
            />

          </div>

        </section>

        {/* =================================================
            RISK ASSESSMENT
        ================================================= */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl">

          <div className="p-6">

            <div className="mb-8 flex items-start justify-between">

              <div>

                <p className="text-sm font-medium">
                  Latest Risk Assessment
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {analysis?.filename ??
                    "No report analyzed yet"}
                </p>

              </div>

              {analysis && (
                <button
                  onClick={() => {
                    setAnalysis(null);
                    setSelectedFile(
                      null
                    );
                    setUploadMessage("");
                    setUploadError("");
                  }}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                  title="Clear analysis"
                >
                  <RefreshCw
                    size={15}
                  />
                </button>
              )}

            </div>

            <div className="flex flex-col items-center justify-between gap-10 md:flex-row">

              <RiskGauge
                score={riskScore}
                level={riskLevel}
              />

              <div className="grid w-full gap-3 sm:grid-cols-3 md:max-w-xl">

                <RiskStat
                  value={String(
                    errors.length
                  )}
                  label="Errors"
                  color="red"
                />

                <RiskStat
                  value={String(
                    warnings.length
                  )}
                  label="Warnings"
                  color="yellow"
                />

                <RiskStat
                  value={
                    analysis
                      ? riskLevel
                      : "—"
                  }
                  label="Risk Level"
                  color="purple"
                />

              </div>

            </div>

          </div>

          <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />

        </section>

        {/* =================================================
            VALIDATION RESULTS
        ================================================= */}

        {analysis && (
          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>

                <p className="text-sm font-medium">
                  Validation Results
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Deterministic validation
                  engine findings
                </p>

              </div>

              <div className="flex rounded-lg border border-white/[0.08] bg-black/10 p-1">

                <FilterButton
                  active={
                    filter === "all"
                  }
                  onClick={() =>
                    setFilter("all")
                  }
                  text={`All ${
                    errors.length +
                    warnings.length
                  }`}
                />

                <FilterButton
                  active={
                    filter === "errors"
                  }
                  onClick={() =>
                    setFilter("errors")
                  }
                  text={`Errors ${errors.length}`}
                />

                <FilterButton
                  active={
                    filter === "warnings"
                  }
                  onClick={() =>
                    setFilter("warnings")
                  }
                  text={`Warnings ${warnings.length}`}
                />

              </div>

            </div>

            <div className="mt-5 space-y-2">

              {filteredIssues.length ===
              0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/5 py-10">

                  <CheckCircle2
                    size={28}
                    className="text-emerald-400"
                  />

                  <p className="mt-3 text-sm text-emerald-300">
                    No issues detected
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    The validation engine
                    found no problems.
                  </p>

                </div>
              ) : (
                filteredIssues.map(
                  (
                    issue,
                    index
                  ) => (
                    <IssueRow
                      key={`${issue.type}-${issue.row}-${index}`}
                      issue={issue}
                    />
                  )
                )
              )}

            </div>

          </section>
        )}

        {/* =================================================
            REPORT HISTORY
        ================================================= */}

        <AnimatePresence>

          {showHistory && (
            <motion.section
               id="report-history"
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              className="mt-6 overflow-hidden"
            >

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-sm font-medium">
                      Report History
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Previously processed
                      reports
                    </p>

                  </div>

                  <button
                    onClick={
                      fetchReports
                    }
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-slate-400 hover:text-white"
                  >

                    <RefreshCw
                      size={15}
                      className={
                        isLoadingReports
                          ? "animate-spin"
                          : ""
                      }
                    />

                  </button>

                </div>

                <div className="mt-5 space-y-2">

                  {reports.length ===
                  0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      No reports found.
                    </div>
                  ) : (
                    reports.map(
                      (report) => (
                        <div
                          key={report.id}
                          onClick={() =>
                            fetchReportDetails(report.id)
                          }
                          className="flex cursor-pointer flex-col justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/10 p-4 transition hover:border-indigo-500/20 hover:bg-white/[0.03] sm:flex-row sm:items-center"
                        >

                          <div className="flex items-center gap-3">

                            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                              <FileText size={16} />
                            </div>

                            <div>

                              <p className="max-w-60 truncate text-xs font-medium text-slate-200">
                                {report.filename}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-600">
                                Report #{report.id}
                              </p>

                            </div>

                          </div>

                          <div className="flex items-center gap-4">

                            <div className="text-right">

                              <p className="text-xs font-medium">
                                {report.risk_score}/100
                              </p>

                              <p
                                className={`text-[10px] ${getRiskTextColor(
                                  report.risk_level
                                )}`}
                              >
                                {report.risk_level}
                              </p>

                            </div>

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteReport(report.id);
                              }}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                              title="Delete report"
                            >
                              <Trash2 size={15} />
                            </button>

                          </div>

                        </div>
                      )
                    )
                  )}

                </div>

              </div>

            </motion.section>
          )}

        </AnimatePresence>

        {/* =================================================
            REPORT DETAILS MODAL
        ================================================= */}

        <AnimatePresence>
          {selectedReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setSelectedReport(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl"
              >

                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <FileCheck2
                        size={20}
                        className="text-indigo-400"
                      />
                      <h2 className="text-lg font-semibold text-white">
                        Report Details
                      </h2>
                    </div>

                    <p className="text-xs text-slate-500">
                      Report #{selectedReport.id}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedReport(null)}
                    className="rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {loadingReportDetails ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2
                      size={24}
                      className="animate-spin text-indigo-400"
                    />
                    <span className="ml-3 text-sm text-slate-400">
                      Loading report details...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-5">

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="mb-4 text-sm font-medium text-white">
                        Report Information
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            File Name
                          </p>
                          <p className="mt-1 break-all text-sm text-slate-200">
                            {selectedReport.filename}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            File Type
                          </p>
                          <p className="mt-1 text-sm text-slate-200">
                            {selectedReport.file_type || "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            Status
                          </p>
                          <p className="mt-1 text-sm text-emerald-400">
                            {selectedReport.status}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            Created At
                          </p>
                          <p className="mt-1 text-sm text-slate-200">
                            {selectedReport.created_at
                              ? new Date(selectedReport.created_at).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="mb-4 text-sm font-medium text-white">
                        Compliance Risk
                      </h3>

                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex-1 rounded-xl bg-black/20 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            Risk Score
                          </p>
                          <p className="mt-2 text-3xl font-semibold text-white">
                            {selectedReport.risk_score}
                            <span className="text-sm text-slate-500">
                              /100
                            </span>
                          </p>
                        </div>

                        <div className="flex-1 rounded-xl bg-black/20 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            Risk Level
                          </p>
                          <p
                            className={`mt-2 text-xl font-semibold ${getRiskTextColor(
                              selectedReport.risk_level
                            )}`}
                          >
                            {selectedReport.risk_level}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <AlertTriangle
                          size={16}
                          className="text-amber-400"
                        />
                        <h3 className="text-sm font-medium text-white">
                          Validation Results
                        </h3>
                      </div>

                      <div className="rounded-lg bg-black/20 p-4">
                        <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-400">
                          {selectedReport.validation_result ||
                            "No validation details available."}
                        </pre>
                      </div>
                    </div>

                    <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/[0.03] p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <Bot
                          size={17}
                          className="text-indigo-400"
                        />
                        <h3 className="text-sm font-medium text-white">
                          AI Compliance Assistant
                        </h3>
                      </div>

                      <div className="rounded-lg bg-black/20 p-4">
                        <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
                          {selectedReport.ai_explanation ||
                            "No AI compliance explanation available."}
                        </pre>
                      </div>
                    </div>

                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="flex flex-col justify-between gap-3 py-10 text-[10px] text-slate-600 sm:flex-row">

          <span>
            ReguTrack • Intelligent Regulatory
            Reporting
          </span>

          <span className="flex items-center gap-2">
            <CheckCircle2 size={12} />
            Secure workspace
          </span>

        </footer>

      </main>

    </div>
  );
}

/* =========================================================
   AI RESPONSE
========================================================= */

function AIResponse({
  response,
}: {
  response: unknown;
}) {
  /*
   * IMPORTANT:
   * Backend/Groq response may be either:
   *
   * 1. string
   * 2. object
   *
   * So we convert it safely before using .replace().
   */

  let responseText = "";

  if (typeof response === "string") {
    responseText = response;
  } else if (
    response &&
    typeof response === "object"
  ) {
    const data =
      response as Record<
        string,
        unknown
      >;

    responseText = String(
      data.content ??
        data.response ??
        data.message ??
        data.summary ??
        JSON.stringify(
          response,
          null,
          2
        )
    );
  } else {
    responseText = String(
      response ?? ""
    );
  }

  const cleanResponse =
  responseText
    .replace(/&#x20;/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\\*\*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\\\*/g, "")
    .replace(/\\`/g, "")
    .replace(/\\-/g, "-")
    .replace(/\\(\d+)\./g, "$1.")
    .replace(/#{1,6}\s/g, "")
    .replace(/\r/g, "")
    .trim();

  /*
   * Find the standard AI sections.
   */

  const sectionPattern =
    /(?:^|\n)\s*(?:\*\*)?\s*(\d+)\.\s*(Compliance Summary|Important Errors and Warnings|Recommended Corrective Actions|Final Conclusion)(?:\*\*)?\s*/gi;

  const matches = [
    ...cleanResponse.matchAll(
      sectionPattern
    ),
  ];

  /*
   * If AI gives an unexpected format,
   * display it safely instead of crashing.
   */

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">

        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {cleanResponse ||
            "No AI compliance analysis was returned."}
        </p>

      </div>
    );
  }

  const sections =
    matches.map(
      (match, index) => {
        const start =
          match.index ?? 0;

        const nextMatch =
          matches[index + 1];

        const end =
          nextMatch?.index ??
          cleanResponse.length;

        const contentStart =
          start + match[0].length;

        const content =
          cleanResponse
            .slice(
              contentStart,
              end
            )
            .trim();

        return {
          number: match[1],
          title: match[2],
          content,
        };
      }
    );

  return (
    <div className="space-y-3">

      {sections.map(
        (
          section,
          index
        ) => {

          const isSummary =
            section.title ===
            "Compliance Summary";

          const isWarning =
            section.title ===
            "Important Errors and Warnings";

          const isAction =
            section.title ===
            "Recommended Corrective Actions";

          const isConclusion =
            section.title ===
            "Final Conclusion";

          return (
            <motion.div
              key={`${section.number}-${section.title}`}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay:
                  index * 0.08,
              }}
              className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
            >

              {/* HEADER */}

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isSummary
                      ? "bg-indigo-500/10 text-indigo-400"
                      : isWarning
                      ? "bg-amber-500/10 text-amber-400"
                      : isAction
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-purple-500/10 text-purple-400"
                  }`}
                >

                  {isSummary && (
                    <FileCheck2
                      size={15}
                    />
                  )}

                  {isWarning && (
                    <AlertTriangle
                      size={15}
                    />
                  )}

                  {isAction && (
                    <CheckCircle2
                      size={15}
                    />
                  )}

                  {isConclusion && (
                    <ShieldCheck
                      size={15}
                    />
                  )}

                </div>

                <div>

                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Section{" "}
                    {
                      section.number
                    }
                  </p>

                  <p className="text-sm font-semibold text-slate-100">
                    {
                      section.title
                    }
                  </p>

                </div>

              </div>

              {/* CONTENT */}

              <div className="mt-4">

                {section.content
                  .split("\n")
                  .map(
                    (
                      line,
                      lineIndex
                    ) => {

                      const trimmed =
                        line.trim();

                      if (!trimmed) {
                        return null;
                      }

                      /*
                       * BULLET
                       */

                      if (
                        trimmed.startsWith(
                          "-"
                        ) ||
                        trimmed.startsWith(
                          "•"
                        )
                      ) {
                        return (
                          <div
                            key={
                              lineIndex
                            }
                            className="mb-2 flex gap-2"
                          >

                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />

                            <p className="text-xs leading-6 text-slate-400">
                              {trimmed
                                .replace(
                                  /^[-•]\s*/,
                                  ""
                                )
                                .replace(
                                  /\*\*/g,
                                  ""
                                )}
                            </p>

                          </div>
                        );
                      }

                      /*
                       * NUMBERED ITEM
                       */

                      if (
                        /^\d+\./.test(
                          trimmed
                        )
                      ) {
                        const actionText =
                          trimmed.replace(
                            /^\d+\.\s*/,
                            ""
                          );

                        return (
                          <div
                            key={
                              lineIndex
                            }
                            className="mb-3 flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3"
                          >

                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-[10px] font-semibold text-emerald-400">
                              {lineIndex +
                                1}
                            </div>

                            <p className="text-xs leading-6 text-slate-400">
                              {actionText.replace(
                                /\*\*/g,
                                ""
                              )}
                            </p>

                          </div>
                        );
                      }

                      /*
                       * NORMAL TEXT
                       */

                      return (
                        <p
                          key={
                            lineIndex
                          }
                          className="mb-2 text-xs leading-6 text-slate-400"
                        >
                          {trimmed.replace(
                            /\*\*/g,
                            ""
                          )}
                        </p>
                      );
                    }
                  )}

              </div>

            </motion.div>
          );
        }
      )}

    </div>
  );
}

/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-500">

      {icon}

      {text}

    </div>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl"
    >

      <div className="flex items-center justify-between">

        <p className="text-xs text-slate-500">
          {title}
        </p>

        <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
          {icon}
        </div>

      </div>

      <p className="mt-5 truncate text-xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>

    </motion.div>
  );
}

/* =========================================================
   FORMAT BADGE
========================================================= */

function FormatBadge({
  text,
}: {
  text: string;
}) {
  return (
    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-slate-500">
      {text}
    </span>
  );
}

/* =========================================================
   PIPELINE STEP
========================================================= */

function PipelineStep({
  number,
  icon,
  text,
}: {
  number: string;
  icon: ReactNode;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -2,
      }}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
    >

      <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
        {icon}
      </div>

      <div>

        <p className="text-[9px] text-slate-600">
          {number}
        </p>

        <span className="text-xs text-slate-400">
          {text}
        </span>

      </div>

    </motion.div>
  );
}

/* =========================================================
   RISK STAT
========================================================= */

function RiskStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color:
    | "red"
    | "yellow"
    | "purple";
}) {
  const textColor = {
    red: "text-red-400",
    yellow: "text-amber-400",
    purple: "text-indigo-400",
  }[color];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">

      <p
        className={`text-xl font-semibold ${textColor}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

    </div>
  );
}

/* =========================================================
   RISK GAUGE
========================================================= */

function RiskGauge({
  score,
  level,
}: {
  score: number;
  level: string;
}) {
  const radius = 58;

  const circumference =
    2 * Math.PI * radius;

  const safeScore =
    Math.min(
      Math.max(score, 0),
      100
    );

  const offset =
    circumference -
    (safeScore / 100) *
      circumference;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">

      <div className="relative h-40 w-40">

        <div className="absolute inset-5 rounded-full bg-amber-500/10 blur-3xl" />

        <svg
          className="relative h-full w-full -rotate-90"
          viewBox="0 0 144 144"
        >

          <circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="9"
          />

          <motion.circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke="url(#riskGradient)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={
              circumference
            }
            initial={{
              strokeDashoffset:
                circumference,
            }}
            animate={{
              strokeDashoffset:
                offset,
            }}
            transition={{
              duration: 1.4,
              ease: "easeOut",
            }}
          />

          <defs>

            <linearGradient
              id="riskGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >

              <stop
                offset="0%"
                stopColor="#10B981"
              />

              <stop
                offset="55%"
                stopColor="#F59E0B"
              />

              <stop
                offset="100%"
                stopColor="#EF4444"
              />

            </linearGradient>

          </defs>

        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">

          <span className="text-4xl font-semibold">
            {safeScore}
          </span>

          <span className="text-[10px] uppercase tracking-widest text-slate-600">
            / 100
          </span>

        </div>

      </div>

      <div>

        <div className="flex items-center gap-2">

          <span
            className={`h-2.5 w-2.5 rounded-full ${getRiskDotColor(
              level
            )}`}
          />

          <span
            className={`text-sm font-semibold ${getRiskTextColor(
              level
            )}`}
          >
            {level}
          </span>

        </div>

        <p className="mt-2 max-w-56 text-xs leading-5 text-slate-500">
          {score === 0
            ? "Upload a report to calculate its compliance risk."
            : getRiskDescription(
                level
              )}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  active,
  onClick,
  text,
}: {
  active: boolean;
  onClick: () => void;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[10px] transition ${
        active
          ? "bg-indigo-500/15 text-indigo-300"
          : "text-slate-600 hover:text-slate-300"
      }`}
    >
      {text}
    </button>
  );
}

/* =========================================================
   ISSUE ROW
========================================================= */

function IssueRow({
  issue,
}: {
  issue: Issue;
}) {
  const isError =
    issue.severity === "ERROR";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 5,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4"
    >

      <div
        className={`mt-0.5 rounded-lg p-2 ${
          isError
            ? "bg-red-500/10 text-red-400"
            : "bg-amber-500/10 text-amber-400"
        }`}
      >

        {isError ? (
          <AlertCircle size={15} />
        ) : (
          <AlertTriangle size={15} />
        )}

      </div>

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">

          <span
            className={`rounded-full px-2 py-0.5 text-[9px] ${
              isError
                ? "bg-red-500/10 text-red-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {issue.severity ??
              "ISSUE"}
          </span>

          {issue.type && (
            <span className="text-[9px] text-slate-600">
              {issue.type}
            </span>
          )}

        </div>

        <p className="mt-2 text-xs leading-5 text-slate-300">
          {issue.message ??
            "Validation issue detected."}
        </p>

        <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-slate-600">

          {issue.column && (
            <span>
              Column:{" "}
              {issue.column}
            </span>
          )}

          {issue.row !==
            undefined && (
            <span>
              Row: {issue.row}
            </span>
          )}

        </div>

      </div>

    </motion.div>
  );
}

/* =========================================================
   RISK HELPERS
========================================================= */

function getRiskTextColor(
  level: string
) {
  const normalized =
    level.toLowerCase();

  if (normalized === "low") {
    return "text-emerald-400";
  }

  if (normalized === "medium") {
    return "text-amber-400";
  }

  if (
    normalized === "high" ||
    normalized === "critical"
  ) {
    return "text-red-400";
  }

  return "text-slate-500";
}

function getRiskDotColor(
  level: string
) {
  const normalized =
    level.toLowerCase();

  if (normalized === "low") {
    return "bg-emerald-400";
  }

  if (normalized === "medium") {
    return "bg-amber-400";
  }

  if (
    normalized === "high" ||
    normalized === "critical"
  ) {
    return "bg-red-400";
  }

  return "bg-slate-500";
}

function getRiskDescription(
  level: string
) {
  const normalized =
    level.toLowerCase();

  if (normalized === "low") {
    return "The report has a relatively low number of detected compliance issues.";
  }

  if (normalized === "medium") {
    return "The report contains significant issues that should be reviewed before further processing.";
  }

  if (normalized === "high") {
    return "The report contains substantial data-quality risks and requires corrective action.";
  }

  if (normalized === "critical") {
    return "The report contains critical issues requiring immediate attention.";
  }

  return "Review the report analysis.";
}

/* =========================================================
   EXPORT
========================================================= */

export default App;