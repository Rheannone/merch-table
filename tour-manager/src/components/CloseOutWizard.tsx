"use client";

import { useState, useEffect } from "react";
import { CloseOut } from "@/types";
import {
  getCurrentSessionStats,
  createCloseOut,
  formatCurrency,
} from "@/lib/closeouts";
import { updateCloseOut } from "@/lib/db";
import {
  XMarkIcon,
  CheckCircleIcon,
  BanknotesIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

interface CloseOutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (closeOut: CloseOut) => void;
  editingCloseOut?: CloseOut | null; // If provided, we're editing instead of creating
  requireCashReconciliation?: boolean; // Global setting
}

export default function CloseOutWizard({
  isOpen,
  onClose,
  onSuccess,
  editingCloseOut = null,
  requireCashReconciliation = false,
}: CloseOutWizardProps) {
  // Wizard steps: 1=Review, 2=Cash(optional), 3=Details, 4=Confirm
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionData, setSessionData] = useState<{
    salesCount: number;
    totalRevenue: number;
    actualRevenue: number;
    discountsGiven: number;
    tipsReceived: number;
    paymentBreakdown: { [method: string]: { count: number; amount: number } };
    productsSold: {
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      sizes: { [size: string]: number };
    }[];
    expectedCash: number;
    saleIds: string[];
    salesPeriod: { startDate: string; endDate: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Form data
  const [sessionName, setSessionName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [skipCashReconciliation, setSkipCashReconciliation] = useState(false);

  // Creating state
  const [isCreating, setIsCreating] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingCloseOut) {
        // Editing mode - populate form with existing data
        setSessionName(editingCloseOut.sessionName || "");
        setLocation(editingCloseOut.location || "");
        setEventDate(editingCloseOut.eventDate || "");
        setNotes(editingCloseOut.notes || "");
        setActualCash(editingCloseOut.actualCash?.toString() || "");
        setCurrentStep(3); // Skip to details step for editing
        setLoading(false);
      } else {
        // Creating mode - load current session data
        loadSessionData();
      }
    }
  }, [isOpen, editingCloseOut]);

  const loadSessionData = async () => {
    setLoading(true);
    try {
      const data = await getCurrentSessionStats();
      setSessionData(data);

      // Pre-populate event date with current time
      setEventDate(new Date().toISOString().split("T")[0]);

      // If no cash sales, skip cash reconciliation
      if (data.expectedCash === 0) {
        setSkipCashReconciliation(true);
      }
    } catch (error) {
      console.error("Failed to load session data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // From review, go to cash or details
      if (
        requireCashReconciliation &&
        sessionData &&
        sessionData.expectedCash > 0 &&
        !skipCashReconciliation
      ) {
        setCurrentStep(2); // Cash reconciliation
      } else {
        setCurrentStep(3); // Skip to details
      }
    } else if (currentStep === 2) {
      setCurrentStep(3); // Cash to details
    } else if (currentStep === 3) {
      setCurrentStep(4); // Details to confirm
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 4) {
      setCurrentStep(3); // Confirm to details
    } else if (currentStep === 3) {
      if (
        requireCashReconciliation &&
        sessionData &&
        sessionData.expectedCash > 0 &&
        !skipCashReconciliation
      ) {
        setCurrentStep(2); // Details to cash
      } else {
        setCurrentStep(1); // Details to review
      }
    } else if (currentStep === 2) {
      setCurrentStep(1); // Cash to review
    }
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      if (editingCloseOut) {
        // Update existing close-out
        const updatedCloseOut: CloseOut = {
          ...editingCloseOut,
          sessionName: sessionName.trim() || undefined,
          location: location.trim() || undefined,
          eventDate: eventDate || editingCloseOut.eventDate,
          notes: notes.trim() || undefined,
          actualCash: actualCash ? parseFloat(actualCash) : undefined,
          cashDifference: actualCash
            ? parseFloat(actualCash) - (editingCloseOut.expectedCash || 0)
            : editingCloseOut.cashDifference,
        };

        await updateCloseOut(updatedCloseOut);
        onSuccess(updatedCloseOut);
      } else {
        // Create new close-out
        const closeOut = await createCloseOut({
          sessionName: sessionName.trim() || undefined,
          location: location.trim() || undefined,
          eventDate: eventDate || undefined,
          notes: notes.trim() || undefined,
          actualCash: actualCash ? parseFloat(actualCash) : undefined,
        });

        onSuccess(closeOut);
      }
    } catch (error) {
      console.error("Failed to save close-out:", error);
      alert("Failed to save close-out. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSessionName("");
    setLocation("");
    setEventDate("");
    setNotes("");
    setActualCash("");
    setSkipCashReconciliation(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-secondary border-2 border-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-on-primary" />
            <h2 className="text-xl font-bold text-on-primary">
              {editingCloseOut ? "Edit Close-Out" : "Close Out Session"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-on-primary hover:bg-black/10 rounded-full p-1 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps (for creating only) */}
        {!editingCloseOut && (
          <div className="bg-theme border-b border-theme px-6 py-3">
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3, 4].map((step) => {
                const isActive = step === currentStep;
                const isCompleted = step < currentStep;
                const shouldShow =
                  step === 1 ||
                  (step === 2 &&
                    requireCashReconciliation &&
                    sessionData &&
                    sessionData.expectedCash > 0 &&
                    !skipCashReconciliation) ||
                  step === 3 ||
                  step === 4;

                if (!shouldShow) return null;

                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isActive
                          ? "bg-primary text-on-primary"
                          : isCompleted
                          ? "bg-green-600 text-white"
                          : "bg-theme-tertiary text-theme-muted"
                      }`}
                    >
                      {isCompleted
                        ? "✓"
                        : step === 2
                        ? "$"
                        : step === 3
                        ? "✏️"
                        : step}
                    </div>
                    {step < 4 && shouldShow && (
                      <ChevronRightIcon className="w-4 h-4 text-theme-muted mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-theme-muted">Loading session data...</div>
            </div>
          ) : (
            <>
              {/* Step 1: Review Session */}
              {currentStep === 1 && sessionData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-theme mb-2">
                      Session Summary
                    </h3>
                    <p className="text-theme-muted">
                      Review your session before closing out
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-theme rounded-lg p-4 text-center">
                      <div className="text-sm text-theme-muted">
                        Sales Count
                      </div>
                      <div className="text-3xl font-bold text-theme">
                        {sessionData.salesCount}
                      </div>
                    </div>
                    <div className="bg-theme rounded-lg p-4 text-center">
                      <div className="text-sm text-theme-muted">
                        Total Revenue
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(sessionData.totalRevenue)}
                      </div>
                    </div>
                    <div className="bg-theme rounded-lg p-4 text-center">
                      <div className="text-sm text-theme-muted">
                        Actual Revenue
                      </div>
                      <div className="text-2xl font-bold text-theme">
                        {formatCurrency(sessionData.actualRevenue)}
                      </div>
                    </div>
                    <div className="bg-theme rounded-lg p-4 text-center">
                      <div className="text-sm text-theme-muted">
                        Discounts Given
                      </div>
                      <div className="text-2xl font-bold text-orange-500">
                        {formatCurrency(sessionData.discountsGiven)}
                      </div>
                    </div>
                  </div>

                  {sessionData.expectedCash > 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BanknotesIcon className="w-5 h-5 text-yellow-400" />
                        <div className="font-semibold text-yellow-200">
                          Cash Sales Detected
                        </div>
                      </div>
                      <div className="text-sm text-yellow-200/80 mb-3">
                        Expected cash in drawer:{" "}
                        <strong>
                          {formatCurrency(sessionData.expectedCash)}
                        </strong>
                      </div>

                      {requireCashReconciliation && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skipCashReconciliation}
                            onChange={(e) =>
                              setSkipCashReconciliation(e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-yellow-200">
                            Skip cash reconciliation (not recommended)
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Cash Reconciliation */}
              {currentStep === 2 && sessionData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <BanknotesIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-theme mb-2">
                      Count Your Cash
                    </h3>
                    <p className="text-theme-muted">
                      Count the cash in your drawer and enter the amount
                    </p>
                  </div>

                  <div className="bg-theme rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-sm text-theme-muted">
                          Expected Cash
                        </div>
                        <div className="text-3xl font-bold text-theme">
                          {formatCurrency(sessionData.expectedCash)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-theme-muted">
                          Actual Cash
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          className="w-full text-3xl font-bold text-center bg-transparent border-b-2 border-primary text-theme focus:outline-none"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                    </div>

                    {actualCash && (
                      <div className="text-center">
                        <div className="text-sm text-theme-muted">
                          Difference
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            parseFloat(actualCash) >= sessionData.expectedCash
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {parseFloat(actualCash) >= sessionData.expectedCash
                            ? "+"
                            : ""}
                          {formatCurrency(
                            parseFloat(actualCash) - sessionData.expectedCash
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Session Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <PencilIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-theme mb-2">
                      Session Details
                    </h3>
                    <p className="text-theme-muted">
                      Add optional details about this session
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-theme mb-2">
                        Session Name
                      </label>
                      <input
                        type="text"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g., Brooklyn Music Hall, Christmas Market Day 1"
                        className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-theme mb-2">
                        <MapPinIcon className="w-4 h-4 inline mr-1" />
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., Brooklyn, NY"
                        className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-theme mb-2">
                        <ClockIcon className="w-4 h-4 inline mr-1" />
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-theme mb-2">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g., Sold out of XL shirts, great crowd"
                        rows={3}
                        className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    {/* Cash reconciliation for editing mode */}
                    {editingCloseOut &&
                      editingCloseOut.expectedCash &&
                      editingCloseOut.expectedCash > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-theme mb-2">
                            <BanknotesIcon className="w-4 h-4 inline mr-1" />
                            Actual Cash Counted
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={actualCash}
                            onChange={(e) => setActualCash(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-theme-muted mt-1">
                            Expected:{" "}
                            {formatCurrency(editingCloseOut.expectedCash || 0)}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 4 && sessionData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-theme mb-2">
                      Ready to Close Out
                    </h3>
                    <p className="text-theme-muted">
                      Review your details one final time
                    </p>
                  </div>

                  <div className="bg-theme rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-theme-muted">Sales:</span>
                        <span className="ml-2 font-semibold">
                          {sessionData.salesCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-theme-muted">Revenue:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          {formatCurrency(sessionData.actualRevenue)}
                        </span>
                      </div>
                    </div>

                    {sessionName && (
                      <div>
                        <span className="text-theme-muted">Name:</span>
                        <span className="ml-2 font-semibold">
                          {sessionName}
                        </span>
                      </div>
                    )}

                    {location && (
                      <div>
                        <span className="text-theme-muted">Location:</span>
                        <span className="ml-2 font-semibold">{location}</span>
                      </div>
                    )}

                    {actualCash && (
                      <div>
                        <span className="text-theme-muted">Cash Count:</span>
                        <span className="ml-2 font-semibold">
                          {formatCurrency(parseFloat(actualCash))}
                          {sessionData.expectedCash > 0 && (
                            <span
                              className={`ml-1 ${
                                parseFloat(actualCash) >=
                                sessionData.expectedCash
                                  ? "text-green-600"
                                  : "text-red-500"
                              }`}
                            >
                              (
                              {parseFloat(actualCash) >=
                              sessionData.expectedCash
                                ? "+"
                                : ""}
                              {formatCurrency(
                                parseFloat(actualCash) -
                                  sessionData.expectedCash
                              )}
                              )
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="bg-theme border-t border-theme p-4 flex items-center justify-between">
            <div>
              {currentStep > 1 && !editingCloseOut && (
                <button
                  onClick={handlePrevStep}
                  className="flex items-center gap-2 px-4 py-2 text-theme-muted hover:text-theme transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-theme-muted hover:text-theme transition-colors"
              >
                Cancel
              </button>

              {currentStep === 4 || editingCloseOut ? (
                <button
                  onClick={handleSubmit}
                  disabled={isCreating}
                  className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold rounded-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {editingCloseOut ? "Saving..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      {editingCloseOut ? "Save Changes" : "Close Out Session"}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  disabled={
                    currentStep === 1 &&
                    (!sessionData || sessionData.salesCount === 0)
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold rounded-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  Next
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
