#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# 환경변수 추가
export FABRIC_CFG_PATH=${PWD} # configtx.yaml 네트워크구성 yaml 포함 -> 안되면 configtxgen 유틸리티 사용불가
# CHANNEL_NAME=mychannel

# remove previous crypto material and config transactions
rm -fr config/*
rm -fr crypto-config/*

# 1. generate crypto material
cryptogen generate --config=./crypto-config.yaml # 결과는 -> crypto-config.dir

# 2. generate genesis block for orderer
configtxgen -profile OneOrgOrdererGenesis -outputBlock ./config/genesis.block

# 3. generate channel configuration transaction
configtxgen -profile OneOrgChannel -outputCreateChannelTx ./config/channel.tx -channelID mychannel

# 4. generate anchor peer transaction
configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./config/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP

configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./config/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP


