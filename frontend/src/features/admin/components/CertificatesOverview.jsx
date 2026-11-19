import { useCallback, useEffect, useState } from "react";
import {
  getAllCertificates,
  downloadCertificatePdf,
  revokeCertificate,
} from "../services/admin.service";
import StatusBadge from "../../shared/components/StatusBadge";
import Loading from "../../shared/components/Loading";
import Toast from "../../shared/components/Toast";
import "./CertificatesOverview.css";
import { useNavigate } from "react-router-dom";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function CertificatesOverview() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [targetCert, setTargetCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCertificates = useCallback(async () => {
    try {
      const response = await getAllCertificates();

      setCertificates(response.certificates || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchCertificates();
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchCertificates();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchCertificates]);

  const handleDownload = async (id, certificateNumber) => {
    try {
      setDownloadingId(id);
      setError(null);

      const response = await downloadCertificatePdf(id);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${certificateNumber || "certificate"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download certificate.");
    } finally {
      setDownloadingId(null);
    }
  };

  const openRevokeModal = (cert) => {
    setTargetCert(cert);
    setRevokeReason("");
    setRevokeModalOpen(true);
  };

  const closeRevokeModal = () => {
    setRevokeModalOpen(false);
    setTargetCert(null);
    setRevokeReason("");
  };

  const handleConfirmRevoke = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim() || !targetCert) return;

    setRevoking(true);
    try {
      await revokeCertificate(targetCert._id, revokeReason.trim());
      setToast({
        message: `Certificate ${targetCert.certificateNumber} has been revoked.`,
        type: "success",
      });
      closeRevokeModal();
      await fetchCertificates();
    } catch (err) {
      setToast({
        message: err.message || "Failed to revoke certificate.",
        type: "error",
      });
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <Loading message="Loading certificates..." />;
  }

  return (
    <section
      className="certificates-overview"
      aria-labelledby="certificates-overview-title"
    >
      <div className="certificates-overview-heading">
        <div>
          <p className="admin-eyebrow">CERTIFICATE DESK</p>

          <h2 id="certificates-overview-title">Certificates Overview</h2>

          <p>View generated certificates and their current status.</p>
        </div>

        <button
          type="button"
          className="certificates-refresh-button"
          onClick={handleRefresh}
        >
          Refresh
        </button>
      </div>

      <Toast message={error} type="error" onClose={() => setError(null)} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {!error && !certificates.length && (
        <p className="certificates-overview-state">No certificates found.</p>
      )}

      {certificates.length > 0 && (
        <div className="certificates-table-wrap">
          <table className="certificates-table">
            <thead>
              <tr>
                <th>Certificate</th>
                <th>Intern</th>
                <th>Type</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {certificates.map((certificate) => {
                const isRevoked = certificate.isRevoked === true || certificate.status === "revoked";
                const displayStatus = isRevoked ? "revoked" : certificate.status === "finalized" ? "valid" : certificate.status;

                return (
                  <tr key={certificate._id}>
                    <td>{certificate.certificateNumber || "—"}</td>

                    <td>{certificate.userId?.fullName || "—"}</td>

                    <td>
                      {certificate.certificateType?.replaceAll("_", " ") || "—"}
                    </td>

                    <td>
                      <StatusBadge status={displayStatus} />
                    </td>

                    <td>{formatDate(certificate.issuedDate)}</td>

                    <td>
                      <div className="certificate-actions">
                        {certificate.status === "draft" && (
                          <button
                            type="button"
                            className="certificate-action-button"
                            onClick={() =>
                              navigate(`/admin/certificates/${certificate._id}`)
                            }
                          >
                            Review
                          </button>
                        )}

                        {certificate.status === "finalized" &&
                          certificate.pdfPath && (
                            <button
                              type="button"
                              className="certificate-action-button"
                              onClick={() =>
                                handleDownload(
                                  certificate._id,
                                  certificate.certificateNumber,
                                )
                              }
                              disabled={downloadingId === certificate._id}
                            >
                              {downloadingId === certificate._id
                                ? "Downloading..."
                                : "Download PDF"}
                            </button>
                          )}

                        {certificate.status === "finalized" && !isRevoked && (
                          <button
                            type="button"
                            className="certificate-action-button certificate-revoke-button"
                            onClick={() => openRevokeModal(certificate)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal for Certificate Revocation */}
      {revokeModalOpen && targetCert && (
        <div
          className="revoke-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
          onClick={closeRevokeModal}
          onKeyDown={(e) => e.key === "Escape" && closeRevokeModal()}
        >
          <div
            className="revoke-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="revoke-modal-header">
              <h3 id="revoke-modal-title">Revoke Certificate</h3>
              <button
                type="button"
                className="revoke-modal-close"
                onClick={closeRevokeModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmRevoke}>
              <div className="revoke-modal-body">
                <p className="revoke-modal-warning">
                  You are about to revoke certificate{" "}
                  <strong>{targetCert.certificateNumber}</strong> issued to{" "}
                  <strong>{targetCert.userId?.fullName || "Intern"}</strong>.
                  Once revoked, public verification scans will display this certificate as revoked.
                </p>

                <div className="revoke-form-group">
                  <label htmlFor="revoke-reason-input">
                    Reason for Revocation <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="revoke-reason-input"
                    className="revoke-reason-textarea"
                    rows={4}
                    placeholder="Enter the official reason for revocation (required)..."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="revoke-modal-footer">
                <button
                  type="button"
                  className="revoke-cancel-button"
                  onClick={closeRevokeModal}
                  disabled={revoking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="revoke-confirm-button"
                  disabled={revoking || !revokeReason.trim()}
                >
                  {revoking ? "Revoking..." : "Confirm Revocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
