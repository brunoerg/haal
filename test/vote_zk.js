const chai = require("chai");
const paillier = require('../node_modules/paillier-bignum/src/paillier.js');
const { encryptWithProof, verifyProof } = require('paillier-in-set-zkp');
const bignum = require('big-integer');
const zkSnark = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require("../node_modules/snarkjs/src/stringifybigint.js");
const fs = require('fs');
const crypto = require('crypto-browserify');
const Stealth = require('stealth_eth');
const ethereum = require('ethereumjs-utils');
const coinkey = require('coinkey');

// ### Web3 Connection
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

// ### Artifacts
const Verifier = artifacts.require('./contracts/HAAL/verifier.sol');

const assert = chai.assert;

contract('HAALVerifier', (accounts) => {
    let aztec;
    // Creating a collection of tests that should pass
    describe('Install contracts and test', () => {
        beforeEach(async () => {
            haalVerifier = await Verifier.new(accounts[0]);
        });
        it('Test Verifier contract', async () => {
            result = await haalVerifier.verifyProof(["0x2c84985e8a82224efd880d654b1a430d2d7e6d864e654e43c31b7e43322b5df3", "0x1a843dedf3161114f8ec663464f51d776340b8f438f111195b41f0b792970ea4"],["0x064c813a7a3c088347ad8eca7ea7c1d3e356549a88bf006d60a73c8ccf27d990", "0x1d9e60915e69d8b40300462037bf85a95a1cfe221086c08f9d1f64fd95900375"],[["0x1f00d24266b58e1b08fe5c928a142142c5b80b94e0f2ff75d3a1a0a9a5892bee", "0x2b5c78d5f66a4a5ab24fc2274ac88797bb9a05c421f1ec37fdb13ebaaa5974f6"],["0x1b76774597bbc9abd4770e7289842ca848888252090a2a4c9232d86fbb2613fd", "0x19748f7c3ba25757902b246ebe74128650091a665bf2becbe444a2b247d8a33d"]],["0x19bfb05a3c8417018f53ebd6129b77ede2e73787906201e9609ba49ef12337d0", "0x120932674cf2f7afc009faa5417b3ab79ca8e65e683cba2c5b59e92eb3e07f22"],["0x238ce555518c7dc8579aaac7c68f5606e89fe015f6c66f4a7efcfc1f4644925e", "0x04106700c74ee240df3b1ed5622bfa9a56d6ee939c5c9c318356c91982874332"],["0x155ebde28a04cad19d6005f2254f61db934d5ccc79370945110c1d393816cdfc", "0x1c22ed448f7d3611c3bde84528b15b5104e5f55c04c72f8cd4bdbc40d7c0f31d"],["0x213ffc72560b74fd2c59a7bd7bf8f87b3bbaa9df640c674d99d859651311de6e", "0x0552eacdaf912da9fb7e9fcd108c7e799935927e67a5b6cde5f8a092cd783d7c"],["0x0e4905bfee808d40839cdc975249cad3710a3b3371babfbfad1d9dee4124f30e", "0x1d40edd5ade6d8c28e7d12aa652331c49ac9d90a14831290b69c94e3b97209ae"],["0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000003","0x0000000000000000000000000000000000000000000000000000000000000004","0x0000000000000000000000000000000000000000000000000000000000000002","0x0000000000000000000000000000000000000000000000000000000000000004"]);
            assert.isTrue(result);
        })
    });
});

describe("Create and test an ethereum stealth wallet", () => {
    // you need to scan every transaction and look for the following:
    // 1. does the transaction contain an OP_RETURN?
    // 2. if yes, then extract the OP_RETURN
    // 3. is the OP_RETURN data a compressed public key (33 bytes)?
    // 4. if yes, check if mine

    let compressedPubScanKeys = ''; 
    let stealth = {};
    let ethStealthAddress = '';
    let pubKeyToRecover = '';
    let opMarker = '';

    it("Voter create scan keys, encode pub+scan public and send to Vote Admin", () => {

        // Optionally generate two key pairs, can use CoinKey, bitcoinjs-lib, bitcore, etc
        // let payloadKeyPair = coinkey.createRandom()
        // let scanKeyPair = coinkey.createRandom()
        // and use it to fill the stealth object

        stealth = new Stealth({ 
            payloadPrivKey: new Buffer('3ee7c0e1d4cbd9c1fe34aef5e910b23fffe2d0bd1d7f2dd51f567078100fe3d1', 'hex'),
            payloadPubKey: new Buffer('026fa340f85b9a0c3a0d75898ef25064ec569c57d1e8922ceb67ec08e9907adfb2', 'hex'),
            scanPrivKey: new Buffer('1ce88522ea4c6927d53799191a6201806d4dce62db69aadd63603cba8d2d8c9f','hex'),
            scanPubKey: new Buffer('032caa1a564f7f7e17ca5424d4f17495a8568600add7fc1587198d151bddc23e84','hex')
        });

        compressedPubScanKeys = stealth.toString();
        assert.equal(compressedPubScanKeys, 'vJmwnas6bWjz6kerJ1SU52LYxf48GZBdR3tn8haF9pj3dAHqYNsGCgW64WF4k1a1RoNYTko62rsuu4wFbydisaaXCoF7SAtYEqwS2E')

    });

    it("Vote admin receives the public addr and creates a new wallet", () => {
        
        let recoveryFromCompressed = Stealth.fromString(compressedPubScanKeys)

        // single-use nonce key pair, works with CoinKey, bitcoinjs-lib, bitcore, etc
        let keypair = coinkey.createRandom()

        // generate payment address
        ethStealthAddress = ethereum.addHexPrefix(recoveryFromCompressed.genEthPaymentAddress(keypair.privateKey));
        pubKeyToRecover = keypair.publicKey.toString('hex');
        opMarker = recoveryFromCompressed.genPaymentPubKeyHash(keypair.privateKey).toString('hex')

        // send three outputs to a smart-contrac:
        // 1. ETH address
        // 1. Regular pubKeyToRecover
        // 2. Marker with `opMarker`

        assert.isTrue(ethereum.isValidAddress(ethStealthAddress));

    });

    it("Voter discovers his wallet", () => {

        let opMarkerBuffer = new Buffer(opMarker, 'hex');
        let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, 'hex');

        let keypair = stealth.checkPaymentPubKeyHash(pubKeyToRecoverBuffer, opMarkerBuffer);

        assert.isNotNull(keypair)
        
    });

    it("Voter recovery private key.", () => {

        let opMarkerBuffer = new Buffer(opMarker, 'hex');
        let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, 'hex');

        let keypair = stealth.checkPaymentPubKeyHash(pubKeyToRecoverBuffer, opMarkerBuffer);

        let PrivateToPublic = ethereum.privateToPublic(keypair.privKey).toString('hex');
        let ethAddress = '0x' + ethereum.privateToAddress(keypair.privKey).toString('hex');
        
        assert.equal(ethAddress,ethStealthAddress);
    });


})

describe("Create vote and zksnark of vote", () => {
    let votes = {};

    // Setting up the vote
    let voter = "0x965cd5b715904c37fcebdcb912c672230103adef";
    let signature = "0x234587623459623459782346592346759234856723985762398756324985762349587623459876234578965978234659823469324876324978632457892364879234697853467896";

    votes.president = [0, 0, 1, 0];
    votes.senator = [1, 0];
    votes.stateGovernor = [0, 0, 0, 1];

    let count_votes = 0;
    let ptv = 0;
    let stv = 0;
    let sgtv = 0;

    for (let i = 0; i < votes.president.length; i++) {
        if (votes.president[i] == 1) {
            ptv += 1;
            count_votes += 1;
        }
    }

    for (let j = 0; j < votes.senator.length; j++) {
        if (votes.senator[j] == 1) {
            stv += 1;
            count_votes += 1;
        }
    }

    for (let k = 0; k < votes.stateGovernor.length; k++) {
        if (votes.stateGovernor[k] == 1) {
            sgtv += 1;
            count_votes += 1;
        }
    }

    // Should create and use sha256 of vote
    //let votesSha256 = crypto.createHash('sha256').update(JSON.stringify(votes).toString()).digest('hex');

    let presidentTotalCandidates = votes.president.length;
    let senatorTotalCandidates = votes.senator.length;
    let stateGovernorTotalCandidades = votes.stateGovernor.length;

    // 
    let p = 1234;
    let rcm = [1234, 13134];

    // Input Array to zk-proof circuit
    const inputArray = {
        "voter": voter.toString(),
        "signature": signature.toString(),
        "president": votes.president,
        "senator": votes.senator,
        "stateGovernor": votes.stateGovernor,
        "p": p,
        "rcm": rcm,
        "presidentTotalCandidates": presidentTotalCandidates,
        "senatorTotalCandidates": senatorTotalCandidates,
        "stateGovernorTotalCandidates": stateGovernorTotalCandidades,
        "presidentTotalVotes": ptv,
        "senatorTotalVotes": stv,
        "stateGovernorTotalVotes": sgtv,
        "totalVotes": count_votes
    };

    let circuit = {};
    let setup = {};
    let witness = {};
    let proof = {};
    let publicKey = {};
    let privateKey = {};

    it("Load a circuit", () => {
        // Circuit preparing
        const circuitDef = JSON.parse(fs.readFileSync("zksnarks/circuits/vote-proof1.json", "utf8"));
        circuit = new zkSnark.Circuit(circuitDef);
        assert.equal(circuit.nOutputs, 4);
    });

    it("Create a trusted setup", () => {
        // Trusted setup
        setup = zkSnark.groth.setup(circuit);
        setup.toxic  // Must be discarded.
        assert.equal(setup.vk_verifier.nPublic, 7);
    }).timeout(10000000);

    it("Generate witness", () => {
        // Generate Witness         
        witness = circuit.calculateWitness(inputArray);
        assert.equal(witness.toString(), "1,1,1,1,3,4,2,4,1,1,1,3,0,0,1,0,1,0,0,0,0,1,858418901399080381986333839137122232297777769967,34077102564424341946805774145332421253459555611827306095970056431371046409817239864580385688030092546598700163424794358633725950204037731083721568214179166939530124130154646,1234,1234,13134,0,1,0,1,0,1,0,0,0");
    });

    it("Generate vote proof", () => {
        const vk_proof = setup.vk_proof
        // Generate the proof
        proof = zkSnark.groth.genProof(vk_proof, witness);
        assert.equal(proof.proof.protocol, "groth");
    });

    it("Verify vote proof", () => {
        // Verify the proof
        const vk_verifier = setup.vk_verifier;
        assert.isTrue(zkSnark.groth.isValid(vk_verifier, proof.proof, proof.publicSignals));
    }).timeout(10000000);
});

describe("Encrypt, count, decrypt and test votes result proof", () => {
    let votes = {};

    // Setting up the vote
    let voter = "0x965cd5b715904c37fcebdcb912c672230103adef";
    let signature = "0x234587623459623459782346592346759234856723985762398756324985762349587623459876234578965978234659823469324876324978632457892364879234697853467896";

    votes.president = [0, 0, 1, 0];
    votes.senator = [1, 0];
    votes.stateGovernor = [0, 0, 0, 1];

    let voteCount = 0;
    let votesArray = [];

    const { publicKey, privateKey } = paillier.generateRandomKeys(1024);

    it("Verify publickey", () => {
        assert(publicKey.bitLength == '1024')
    });

    it("Encrypt votes", () => {
        for (let i = 0; i < votes.president.length; i++) {
            voteCount += votes.president[i];
            // convert vote to bignum
            //let bn1 = bignum(votes.president[i]).mod(publicKey.n);
            let bn1 = bignum(votes.president[i]);
            bn1 = bn1.mod(publicKey.n);
            while (bn1.lt(0)) bn1 = bn1.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            votes.president[i] = publicKey.encrypt(votes.president[i]);
        }

        for (let j = 0; j < votes.senator.length; j++) {
            voteCount += votes.senator[j];
            // convert vote to bignum
            let bn2 = bignum(votes.senator[j]).mod(publicKey.n);
            while (bn2.lt(0)) bn2 = bn2.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            votes.senator[j] = publicKey.encrypt(votes.senator[j]);
        }

        for (let k = 0; k < votes.stateGovernor.length; k++) {
            voteCount += votes.stateGovernor[k];
            // convert vote to bignum
            let bn3 = bignum(votes.stateGovernor[k]).mod(publicKey.n);
            while (bn3.lt(0)) bn3 = bn3.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            votes.stateGovernor[k] = publicKey.encrypt(votes.stateGovernor[k]);
        }
        assert(votes.president[0].mod(votes.president[0]).toString() == '0'); // must be bignumber to .mod()
    });

    it("Testing sum on encrypted votes", () => {

        let encryptedSum = 0;
        let bn5 = bignum(encryptedSum).mod(publicKey.n);
        while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
        encryptedSum = publicKey.encrypt(encryptedSum);

        for (let i = 0; i < votes.president.length; i++) {
            encryptedSum = publicKey.addition(votes.president[i], encryptedSum);
            votesArray.push(votes.president[i]);
        }

        for (let j = 0; j < votes.senator.length; j++) {
            encryptedSum = publicKey.addition(votes.senator[j], encryptedSum);
            votesArray.push(votes.senator[j]);
        }

        for (let k = 0; k < votes.stateGovernor.length; k++) {
            encryptedSum = publicKey.addition(votes.stateGovernor[k], encryptedSum);
            votesArray.push(votes.stateGovernor[k]);
        }

        let decryptedSum = privateKey.decrypt(encryptedSum);
        assert(decryptedSum.toString() == voteCount.toString());
    });

    it("Create a proof of result, and test result", () => {
        const [encrypted, proof] = encryptWithProof(publicKey, voteCount, [voteCount], publicKey.bitLength)
        const result = verifyProof(publicKey, encrypted, proof, [voteCount], publicKey.bitLength) // true
        let decrypted = privateKey.decrypt(encrypted);
        assert(result == true && decrypted == voteCount);
    }).timeout(10000000);

});

contract
