const CONTRACT_ADDRESS = "0xD2B4767102B4F0cD75bD0276e5fAAeB7E25e81f1";

// ABI ของ Contract ตัวอย่าง Bank.sol ในขั้นที่ 1
const CONTRACT_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function checkBlance() view returns (uint256)",
];

const SEPOLIA_CHAIN_ID = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

let provider;
let signer;
let contract;

async function switchToSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: SEPOLIA_CHAIN_ID_HEX,
          chainName: "Sepolia",
          nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        },
      ],
    });
  }
}

// เชื่อมต่อ MetaMask
async function connectWallet() {
  try {
    if (!window.ethereum) {
      throw new Error("กรุณาติดตั้ง MetaMask");
    }

    await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // เปลี่ยนเครือข่ายเป็น Sepolia ก่อนเชื่อมต่อ Contract
    await switchToSepolia();

    provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error("กรุณาเลือก Sepolia ใน MetaMask");
    }

    signer = await provider.getSigner();

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const address = await signer.getAddress();

    document.getElementById("walletAddress").textContent = "Wallet: " + address;

    document.getElementById("status").textContent = "เชื่อมต่อ MetaMask สำเร็จ";

    await updateNetworkStatus();
    await checkBalance();
  } catch (error) {
    showError(error);
  }
}

// ตรวจสอบเครือข่าย
async function updateNetworkStatus() {
  if (!window.ethereum) return;

  const currentProvider = new ethers.BrowserProvider(window.ethereum);

  const network = await currentProvider.getNetwork();

  document.getElementById("networkStatus").textContent =
    network.chainId === SEPOLIA_CHAIN_ID
      ? "เครือข่าย: Sepolia"
      : "เครือข่ายไม่ถูกต้อง กรุณาเลือก Sepolia";
}

// ตรวจสอบยอดเงินของ Wallet ที่เชื่อมต่อ
async function checkBalance() {
  try {
    if (!contract) {
      throw new Error("กรุณาเชื่อมต่อ Wallet ก่อน");
    }

    const balance = await contract.checkBlance();

    document.getElementById("balance").textContent =
      ethers.formatEther(balance) + " ETH";

    document.getElementById("status").textContent = "ตรวจสอบยอดเงินสำเร็จ";
  } catch (error) {
    showError(error);
  }
}

// ฝาก ETH
async function deposit() {
  try {
    if (!contract) {
      throw new Error("กรุณาเชื่อมต่อ Wallet ก่อน");
    }

    const amount = document.getElementById("depositAmount").value.trim();

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new Error("กรุณากรอกจำนวน ETH ให้ถูกต้อง");
    }

    // แปลง ETH เป็นหน่วย Wei
    const value = ethers.parseEther(amount);

    document.getElementById("status").textContent =
      "กรุณายืนยันธุรกรรมใน MetaMask";

    const tx = await contract.deposit({ value });

    document.getElementById("status").textContent = "กำลังรอยืนยันธุรกรรม...";

    await tx.wait();

    document.getElementById("depositAmount").value = "";

    await checkBalance();

    document.getElementById("status").textContent = "ฝากเงินสำเร็จ";
  } catch (error) {
    showError(error);
  }
}

// ถอน ETH
async function withdraw() {
  try {
    if (!contract) {
      throw new Error("กรุณาเชื่อมต่อ Wallet ก่อน");
    }

    const amount = document.getElementById("withdrawAmount").value.trim();

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new Error("กรุณากรอกจำนวน ETH ให้ถูกต้อง");
    }

    // แปลง ETH เป็นหน่วย Wei
    const value = ethers.parseEther(amount);

    document.getElementById("status").textContent =
      "กรุณายืนยันธุรกรรมใน MetaMask";

    const tx = await contract.withdraw(value);

    document.getElementById("status").textContent = "กำลังรอยืนยันธุรกรรม...";

    await tx.wait();

    document.getElementById("withdrawAmount").value = "";

    await checkBalance();

    document.getElementById("status").textContent = "ถอนเงินสำเร็จ";
  } catch (error) {
    showError(error);
  }
}

// แสดงข้อผิดพลาด
function showError(error) {
  console.error(error);

  let message =
    error.shortMessage || error.reason || error.message || "เกิดข้อผิดพลาด";

  if (error.code === "ACTION_REJECTED" || error.code === 4001) {
    message = "คุณยกเลิกธุรกรรม";
  }

  document.getElementById("status").textContent = "ผิดพลาด: " + message;
}

// เชื่อมปุ่มกับฟังก์ชัน
document
  .getElementById("connectButton")
  .addEventListener("click", connectWallet);

document
  .getElementById("refreshButton")
  .addEventListener("click", checkBalance);

document.getElementById("depositButton").addEventListener("click", deposit);

document.getElementById("withdrawButton").addEventListener("click", withdraw);

// เมื่อเปลี่ยนบัญชีหรือเครือข่าย ให้โหลดสถานะใหม่
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    window.location.reload();
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}
