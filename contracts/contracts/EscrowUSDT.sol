// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title EscrowUSDT - Milestone-based USDT escrow for freelance contracts
/// @notice Handles deposits, milestone releases, and dispute resolution with arbiter voting
/// @dev Circuit breaker (Pausable) for emergency stops. ReentrancyGuard on all fund movements.
contract EscrowUSDT is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // --- Types ---

    enum EscrowStatus {
        Created,
        Funded,
        InProgress,
        Completed,
        Disputed,
        Resolved,
        Cancelled
    }

    enum MilestoneStatus {
        Pending,
        InProgress,
        Submitted,
        Approved,
        Disputed
    }

    enum DisputeVote {
        None,
        FavorClient,
        FavorFreelancer
    }

    struct Milestone {
        string description;
        uint256 amount;
        MilestoneStatus status;
    }

    struct Escrow {
        uint256 jobId;
        address client;
        address freelancer;
        uint256 totalAmount;
        uint256 releasedAmount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 disputeDeadline;
        Milestone[] milestones;
    }

    struct Dispute {
        uint256 escrowId;
        uint256 milestoneIndex;
        address[3] arbiters;
        DisputeVote[3] votes;
        uint8 voteCount;
        bool resolved;
        uint256 createdAt;
    }

    // --- State ---

    IERC20 public immutable usdt;
    uint256 public escrowCount;
    uint256 public disputeCount;
    uint256 public constant DISPUTE_PERIOD = 7 days;
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    address public feeRecipient;

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256) public escrowToDispute; // escrowId => disputeId
    mapping(address => bool) public registeredArbiters;

    // --- Events ---

    event EscrowCreated(uint256 indexed escrowId, uint256 indexed jobId, address client, address freelancer, uint256 totalAmount);
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event MilestoneSubmitted(uint256 indexed escrowId, uint256 milestoneIndex);
    event MilestoneApproved(uint256 indexed escrowId, uint256 milestoneIndex, uint256 amount);
    event FundsReleased(uint256 indexed escrowId, address freelancer, uint256 amount);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed disputeId, uint256 milestoneIndex);
    event DisputeVoted(uint256 indexed disputeId, address arbiter, DisputeVote vote);
    event DisputeResolved(uint256 indexed disputeId, DisputeVote outcome);
    event EscrowCancelled(uint256 indexed escrowId);
    event ArbiterRegistered(address arbiter);
    event ArbiterRemoved(address arbiter);
    event CircuitBreakerTriggered(address triggeredBy);

    // --- Modifiers ---

    modifier onlyClient(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].client, "Not the client");
        _;
    }

    modifier onlyFreelancer(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].freelancer, "Not the freelancer");
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(escrowId < escrowCount, "Escrow does not exist");
        _;
    }

    // --- Constructor ---

    constructor(address _usdt, address _feeRecipient) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        usdt = IERC20(_usdt);
        feeRecipient = _feeRecipient;
    }

    // --- Escrow Lifecycle ---

    /// @notice Create an escrow with milestones. Called by FreelanceMarket contract or directly.
    function createEscrow(
        uint256 jobId,
        address client,
        address freelancer,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneAmounts
    ) external whenNotPaused returns (uint256) {
        require(client != address(0) && freelancer != address(0), "Invalid addresses");
        require(client != freelancer, "Client cannot be freelancer");
        require(milestoneDescriptions.length > 0, "Need at least 1 milestone");
        require(milestoneDescriptions.length == milestoneAmounts.length, "Array length mismatch");
        require(milestoneDescriptions.length <= 10, "Max 10 milestones");

        uint256 escrowId = escrowCount++;
        Escrow storage e = escrows[escrowId];
        e.jobId = jobId;
        e.client = client;
        e.freelancer = freelancer;
        e.status = EscrowStatus.Created;
        e.createdAt = block.timestamp;

        uint256 total = 0;
        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            require(milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            e.milestones.push(Milestone({
                description: milestoneDescriptions[i],
                amount: milestoneAmounts[i],
                status: MilestoneStatus.Pending
            }));
            total += milestoneAmounts[i];
        }
        e.totalAmount = total;

        emit EscrowCreated(escrowId, jobId, client, freelancer, total);
        return escrowId;
    }

    /// @notice Client funds the escrow with USDT. Must approve this contract first.
    function fundEscrow(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        whenNotPaused
        nonReentrant
    {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.Created, "Escrow not in Created state");

        usdt.safeTransferFrom(msg.sender, address(this), e.totalAmount);
        e.status = EscrowStatus.Funded;

        emit EscrowFunded(escrowId, e.totalAmount);
    }

    /// @notice Freelancer starts working on a milestone
    function startMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        onlyFreelancer(escrowId)
        whenNotPaused
    {
        Escrow storage e = escrows[escrowId];
        require(
            e.status == EscrowStatus.Funded || e.status == EscrowStatus.InProgress,
            "Escrow not active"
        );
        require(milestoneIndex < e.milestones.length, "Invalid milestone");
        require(e.milestones[milestoneIndex].status == MilestoneStatus.Pending, "Milestone not pending");

        e.milestones[milestoneIndex].status = MilestoneStatus.InProgress;
        if (e.status == EscrowStatus.Funded) {
            e.status = EscrowStatus.InProgress;
        }
    }

    /// @notice Freelancer submits milestone for client review
    function submitMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        onlyFreelancer(escrowId)
        whenNotPaused
    {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.InProgress, "Escrow not in progress");
        require(milestoneIndex < e.milestones.length, "Invalid milestone");
        require(
            e.milestones[milestoneIndex].status == MilestoneStatus.InProgress,
            "Milestone not in progress"
        );

        e.milestones[milestoneIndex].status = MilestoneStatus.Submitted;
        emit MilestoneSubmitted(escrowId, milestoneIndex);
    }

    /// @notice Client approves milestone and releases funds to freelancer
    function approveMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        whenNotPaused
        nonReentrant
    {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.InProgress, "Escrow not in progress");
        require(milestoneIndex < e.milestones.length, "Invalid milestone");
        require(
            e.milestones[milestoneIndex].status == MilestoneStatus.Submitted,
            "Milestone not submitted"
        );

        Milestone storage m = e.milestones[milestoneIndex];
        m.status = MilestoneStatus.Approved;

        uint256 fee = (m.amount * PLATFORM_FEE_BPS) / 10_000;
        uint256 freelancerAmount = m.amount - fee;

        e.releasedAmount += m.amount;

        usdt.safeTransfer(e.freelancer, freelancerAmount);
        if (fee > 0) {
            usdt.safeTransfer(feeRecipient, fee);
        }

        emit MilestoneApproved(escrowId, milestoneIndex, m.amount);
        emit FundsReleased(escrowId, e.freelancer, freelancerAmount);

        // Check if all milestones are approved
        if (e.releasedAmount >= e.totalAmount) {
            e.status = EscrowStatus.Completed;
        }
    }

    // --- Disputes ---

    /// @notice Either party can open a dispute on a submitted milestone
    function openDispute(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        whenNotPaused
    {
        Escrow storage e = escrows[escrowId];
        require(
            msg.sender == e.client || msg.sender == e.freelancer,
            "Not a party to this escrow"
        );
        require(e.status == EscrowStatus.InProgress, "Escrow not in progress");
        require(milestoneIndex < e.milestones.length, "Invalid milestone");
        require(
            e.milestones[milestoneIndex].status == MilestoneStatus.Submitted,
            "Milestone not submitted"
        );

        e.milestones[milestoneIndex].status = MilestoneStatus.Disputed;
        e.status = EscrowStatus.Disputed;
        e.disputeDeadline = block.timestamp + DISPUTE_PERIOD;

        uint256 disputeId = disputeCount++;
        Dispute storage d = disputes[disputeId];
        d.escrowId = escrowId;
        d.milestoneIndex = milestoneIndex;
        d.createdAt = block.timestamp;

        escrowToDispute[escrowId] = disputeId;

        emit DisputeOpened(escrowId, disputeId, milestoneIndex);
    }

    /// @notice Owner assigns 3 arbiters to a dispute (multi-sig 2/3 vote)
    function assignArbiters(uint256 disputeId, address[3] calldata arbiters) external onlyOwner {
        Dispute storage d = disputes[disputeId];
        require(!d.resolved, "Dispute already resolved");
        for (uint256 i = 0; i < 3; i++) {
            require(registeredArbiters[arbiters[i]], "Arbiter not registered");
            require(
                arbiters[i] != escrows[d.escrowId].client &&
                arbiters[i] != escrows[d.escrowId].freelancer,
                "Arbiter cannot be a party"
            );
            d.arbiters[i] = arbiters[i];
        }
    }

    /// @notice Arbiter casts vote on dispute
    function voteOnDispute(uint256 disputeId, DisputeVote vote) external whenNotPaused {
        require(vote == DisputeVote.FavorClient || vote == DisputeVote.FavorFreelancer, "Invalid vote");
        Dispute storage d = disputes[disputeId];
        require(!d.resolved, "Dispute already resolved");

        uint256 arbiterIndex = type(uint256).max;
        for (uint256 i = 0; i < 3; i++) {
            if (d.arbiters[i] == msg.sender) {
                arbiterIndex = i;
                break;
            }
        }
        require(arbiterIndex != type(uint256).max, "Not an arbiter for this dispute");
        require(d.votes[arbiterIndex] == DisputeVote.None, "Already voted");

        d.votes[arbiterIndex] = vote;
        d.voteCount++;

        emit DisputeVoted(disputeId, msg.sender, vote);

        // Resolve if 2+ votes collected
        if (d.voteCount >= 2) {
            _resolveDispute(disputeId);
        }
    }

    function _resolveDispute(uint256 disputeId) internal nonReentrant {
        Dispute storage d = disputes[disputeId];
        if (d.resolved) return;

        uint8 clientVotes = 0;
        uint8 freelancerVotes = 0;
        for (uint256 i = 0; i < 3; i++) {
            if (d.votes[i] == DisputeVote.FavorClient) clientVotes++;
            else if (d.votes[i] == DisputeVote.FavorFreelancer) freelancerVotes++;
        }

        // Need 2/3 majority
        if (clientVotes < 2 && freelancerVotes < 2) return;

        d.resolved = true;
        Escrow storage e = escrows[d.escrowId];
        Milestone storage m = e.milestones[d.milestoneIndex];

        DisputeVote outcome;
        if (clientVotes >= 2) {
            // Refund client for this milestone
            outcome = DisputeVote.FavorClient;
            usdt.safeTransfer(e.client, m.amount);
            e.releasedAmount += m.amount;
            m.status = MilestoneStatus.Approved; // Mark as resolved
        } else {
            // Pay freelancer
            outcome = DisputeVote.FavorFreelancer;
            uint256 fee = (m.amount * PLATFORM_FEE_BPS) / 10_000;
            uint256 freelancerAmount = m.amount - fee;
            usdt.safeTransfer(e.freelancer, freelancerAmount);
            if (fee > 0) {
                usdt.safeTransfer(feeRecipient, fee);
            }
            e.releasedAmount += m.amount;
            m.status = MilestoneStatus.Approved;
        }

        e.status = EscrowStatus.Resolved;

        // Check if all funds distributed
        if (e.releasedAmount >= e.totalAmount) {
            e.status = EscrowStatus.Completed;
        }

        emit DisputeResolved(disputeId, outcome);
    }

    // --- Cancel ---

    /// @notice Cancel escrow and refund client. Only if not yet started or by mutual agreement.
    function cancelEscrow(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        whenNotPaused
        nonReentrant
    {
        Escrow storage e = escrows[escrowId];
        require(
            e.status == EscrowStatus.Created || e.status == EscrowStatus.Funded,
            "Cannot cancel active escrow"
        );

        if (e.status == EscrowStatus.Funded) {
            usdt.safeTransfer(e.client, e.totalAmount);
        }
        e.status = EscrowStatus.Cancelled;

        emit EscrowCancelled(escrowId);
    }

    // --- Admin ---

    function registerArbiter(address arbiter) external onlyOwner {
        require(arbiter != address(0), "Invalid address");
        registeredArbiters[arbiter] = true;
        emit ArbiterRegistered(arbiter);
    }

    function removeArbiter(address arbiter) external onlyOwner {
        registeredArbiters[arbiter] = false;
        emit ArbiterRemoved(arbiter);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    /// @notice Circuit breaker - pause all operations in emergency
    function triggerCircuitBreaker() external onlyOwner {
        _pause();
        emit CircuitBreakerTriggered(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Views ---

    function getEscrow(uint256 escrowId) external view returns (
        uint256 jobId,
        address client,
        address freelancer,
        uint256 totalAmount,
        uint256 releasedAmount,
        EscrowStatus status,
        uint256 createdAt
    ) {
        Escrow storage e = escrows[escrowId];
        return (e.jobId, e.client, e.freelancer, e.totalAmount, e.releasedAmount, e.status, e.createdAt);
    }

    function getMilestone(uint256 escrowId, uint256 milestoneIndex) external view returns (
        string memory description,
        uint256 amount,
        MilestoneStatus status
    ) {
        Milestone storage m = escrows[escrowId].milestones[milestoneIndex];
        return (m.description, m.amount, m.status);
    }

    function getMilestoneCount(uint256 escrowId) external view returns (uint256) {
        return escrows[escrowId].milestones.length;
    }

    function getDispute(uint256 disputeId) external view returns (
        uint256 escrowId,
        uint256 milestoneIndex,
        address[3] memory arbiters,
        DisputeVote[3] memory votes,
        uint8 voteCount,
        bool resolved
    ) {
        Dispute storage d = disputes[disputeId];
        return (d.escrowId, d.milestoneIndex, d.arbiters, d.votes, d.voteCount, d.resolved);
    }
}
