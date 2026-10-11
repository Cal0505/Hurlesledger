import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock3, RefreshCw, X } from 'lucide-react';
import { HouseholdAccessRequest } from '../types/budget';

interface AccessRequestsPanelProps {
  requests: HouseholdAccessRequest[];
  onResolveRequest: (userId: string, approve: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const AccessRequestsPanel: React.FC<AccessRequestsPanelProps> = ({
  requests,
  onResolveRequest,
  onRefresh,
}) => {
  const [processingUserId, setProcessingUserId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    let isMounted = true;
    let isLoadingRequests = false;

    const refreshRequests = async () => {
      if (isLoadingRequests) return;
      isLoadingRequests = true;
      try {
        await onRefreshRef.current();
        if (isMounted) setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh access requests.');
        }
      } finally {
        isLoadingRequests = false;
      }
    };

    void refreshRequests();
    const intervalId = window.setInterval(() => void refreshRequests(), 15000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const resolve = async (userId: string, approve: boolean) => {
    setProcessingUserId(userId);
    setErrorMessage('');
    try {
      await onResolveRequest(userId, approve);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to review the access request.');
    } finally {
      setProcessingUserId('');
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    setErrorMessage('');
    try {
      await onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh access requests.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (requests.length === 0 && !errorMessage) {
    return (
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={isRefreshing}
        className="access-refresh-btn"
      >
        <RefreshCw className={isRefreshing ? 'access-spin' : ''} />
        {isRefreshing ? 'Checking access requests…' : 'Check access requests'}
      </button>
    );
  }

  return (
    <section className="access-panel">
      <div className="access-header-row">
        <Clock3 />
        <h2 className="access-heading">Access requests</h2>
        <span className="access-count-badge">{requests.length}</span>
      </div>

      <p className="access-subtext">
        Approve access first. New users will create their household profile after approval.
      </p>

      <button
        type="button"
        onClick={() => void refresh()}
        disabled={isRefreshing || processingUserId !== ''}
        className="access-refresh-link"
      >
        <RefreshCw />
        Refresh requests
      </button>

      <div className="access-requests-list">
        {requests.map((request) => (
          <div key={request.id} className="access-request-card">
            <div>
              <p className="access-requester-name">
                {request.email}
              </p>
              <p className="access-requester-email">
                User ID: {request.userId}
              </p>
              <p className="access-requester-date">
                Requested {new Date(request.requestedAt).toLocaleDateString('en-GB')}
              </p>
            </div>

            <div className="access-action-buttons">
              <button
                type="button"
                onClick={() => void resolve(request.userId, false)}
                disabled={processingUserId !== ''}
                className="access-deny-btn"
              >
                <X size={14} />
                Deny
              </button>

              <button
                type="button"
                onClick={() => void resolve(request.userId, true)}
                disabled={processingUserId !== ''}
                className="access-approve-btn"
              >
                <Check size={14} />
                {processingUserId === request.userId ? 'Saving…' : 'Approve access'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {errorMessage && (
        <p role="alert" className="access-error-text">{errorMessage}</p>
      )}
    </section>
  );
};