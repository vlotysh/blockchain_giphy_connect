import React, {useEffect, useState} from "react";
import {ethers} from "ethers";

import {contractAbi, contractAddress} from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum)
    const signer = provider.getSigner()
    const transactionContract = new ethers.Contract(contractAddress, contractAbi, signer)

    return transactionContract;
}

export const TransactionProvider = ({children}) => {
    const [currentAccount, setCurrentAccount] = useState('');
    const [formData, setFormData] = useState({addressTo: '', amount: '', keyword: '', message: ''});
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));
    const [transactions, setTransactions] = useState([]);

    const handleChange = (e, name) => {
        console.log(formData)
        setFormData((prevState) => ({...prevState, [name]: e.target.value}));
    }

    const getAllTransactions = async () => {
        try {
            if (!ethereum) return alert("Please install meta mask");
            const transactionContract = getEthereumContract();

            const availableTransactions = await transactionContract.getAllTransactions();


            const structuredTransactions = availableTransactions.map((transaction) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18)
            }));

            setTransactions(structuredTransactions)
            console.log(structuredTransactions);
        } catch (err) {
            console.error(err);
        }


    }

    const checkIfWalletIsConnected = async () => {
        try {
            if (!ethereum) return alert("Please install meta mask");

            const accounts = await ethereum.request({method: 'eth_accounts'});

            if (accounts.length) {
                setCurrentAccount(accounts[0])

                getAllTransactions()
            } else {
                console.log('No accounts')
            }
        } catch (err) {
            console.error(err)

            throw new Error("No ethereum account");
        }
    }

    const checkIfTransactionExist = async () => {
        try {
            const transactionContract = getEthereumContract();

            const transactionCount = await transactionContract.getTransactionCount();
           window.localStorage.setItem("transactionCount", transactionCount.toNumber())

        } catch (err) {

        }
    }

    const connectWallet = async () => {
        try {
            if (!ethereum) return alert("Please install meta mask");

            const accounts = await ethereum.request({method: 'eth_requestAccounts'});

            setCurrentAccount(accounts[0])
        } catch (err) {
            console.error(err)

            throw new Error("No ethereum account");
        }
    }

    const sendTransaction = async () => {
        try {
           if (!ethereum) return alert("Please install Mask")

            const { addressTo, amount, keyword, message} = formData;
            const transactionContract = getEthereumContract();
            const parsedAmount = ethers.utils.parseEther(amount);

            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: '0x5208', //hex, 21000 GWEI,
                    value: parsedAmount._hex, // 0.00001
                }]
            });

            const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);

            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);

            await transactionHash.wait();

            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);

            const transactionCount = await transactionContract.getTransactionCount();
            console.log(transactionCount.toNumber())
        } catch (err) {
            console.error(err)

            throw new Error("No ethereum account");
        }
    }

    useEffect(() => {
            checkIfWalletIsConnected();
            checkIfTransactionExist();
    },[])


    return(
        <TransactionContext.Provider value={{ connectWallet , currentAccount, formData, sendTransaction, handleChange, transactions, isLoading }}>
            {children}
        </TransactionContext.Provider>
    )
}