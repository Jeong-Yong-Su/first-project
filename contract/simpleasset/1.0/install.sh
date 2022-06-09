#!/bin/bash

set -x

# 체인코드 simpleasset 설치
docker exec cli peer chaincode install -n simpleasset -v 1.0 -p github.com/simpleasset/1.0
docker exec cli peer chaincode list --installed
# 체인코드 simpleasset 배포
docker exec cli peer chaincode instantiate -n simpleasset -v 1.0 -C mychannel -c '{"Args":["a","100"]}' -P 'OR("Org1MSP.member")'
sleep 3
docker exec cli peer chaincode list --instantiated -C mychannel
# 체인코드 테스트 Query - Invoke - Query
docker exec cli peer chaincode query -n simpleasset -C mychannel -c '{"Args":["get","a"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c '{"Args":["set","b","200"]}'
sleep 3
docker exec cli peer chaincode query -n simpleasset -C mychannel -c '{"Args":["get","b"]}'