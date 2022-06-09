#!/bin/bash

set -x

docker exec cli peer chaincode install -n simpleasset -v 1.1.1 -p github.com/simpleasset/1.1/
docker exec cli peer chaincode list --installed

docker exec cli peer chaincode instantiate -n simpleasset -v 1.1.1 -C mychannel -c '{"Args":[]}' -P 'OR ("Org1MSP.member", "Org2MSP.member")'
docker exec cli peer chaincode list --instantiated -C mychannel
sleep 3
docker exec cli peer chaincode query -n simpleasset -C mychannel -c'{"Args":["get","a"]}'
docker exec cli peer chaincode query -n simpleasset -C mychannel -c'{"Args":["get","b"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c'{"Args":["set","a","100"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c'{"Args":["set","b","200"]}'
sleep 3
docker exec cli peer chaincode query -n simpleasset -C mychannel -c'{"Args":["history","a"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c'{"Args":["transfer","a","c","20"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c'{"Args":["transfer","a","b","200"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c'{"Args":["transfer","a","b","20"]}'
sleep 3
docker exec cli peer chaincode query -n simpleasset -C mychannel -c'{"Args":["history","a"]}'
docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c'{"Args":["del","b"]}'
docker exec cli peer chaincode query -n simpleasset -C mychannel -c'{"Args":["history","b"]}'

#docker exec cli peer chaincode install -n simpleasset -v 1.0 -p github.com/simpleasset/1.0
#docker exec cli peer chaincode list --installed

#docker exec cli peer chaincode instantiate -n simpleasset -v 1.0 -C mychannel -c '{"Args":["a","100"]}' -P 'OR("Org1MSP.member")'
#sleep 3
#docker exec cli peer chaincode list --instantiated -C mychannel

#docker exec cli peer chaincode query -n simpleasset -C mychannel -c '{"Args":["get","a"]}'
#docker exec cli peer chaincode invoke -n simpleasset -C mychannel -c '{"Args":["set","b","200"]}'
#sleep 3
#docker exec cli peer chaincode query -n simpleasset -C mychannel -c '{"Args":["get","b"]}'