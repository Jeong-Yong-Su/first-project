// 패키지 정의
package main

// 1. 외부모듈 포함
import (
	"fmt"
	"encoding/json"
	"strconv"
	"time"
	"bytes"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

// 2. 체인코드 클래스 정의 - SimpleAsset
type SimpleAsset struct {
}

// JSON 으로 변환할 구조체정의
type Asset struct {
		Key	string `json:"key"`
		Value string `json:"value"`
}

// 3. Init 함수
func (t *SimpleAsset) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

// 4. Invoke 함수
func (t *SimpleAsset) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	fn, args := stub.GetFunctionAndParameters()

	if fn == "set" {
		return t.Set(stub, args)
	} else if fn == "get" {
		return t.Get(stub, args)
	} else if fn == "del" { // args x 1 (key)
		return t.Del(stub, args)
	} else if fn == "transfer" { //args x 3 (from, to, account)
		return t.Transfer(stub, args)
	} else if fn == "history" { // args x 1 (key)
		return t.History(stub, args)
	}

	return shim.Error("Not supported function name")
}

// 5. Set 함수
func (t *SimpleAsset) Set(stub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect arguments. Expecting a key and value")
	}
	asset := Asset{Key: args[0], Value: args[1]}

	assetAsBytes, err := json.Marshal(asset)
	if err != nil {
		return shim.Error("Failed to marshal arguments: " + args[0] + " " + args[1])
	}

	err = stub.PutState(args[0], assetAsBytes)
	if err != nil {
		return shim.Error(fmt.Sprintf("Failed to set asset: %s", args[0]))
	}

	// 오류체크 중복 키 검사 -> 덮어쓰기로 해결
	//err = stub.PutState(args[0], []byte(args[1]))
	//if err != nil {
		//return shim.Error("Failed to set asset: " + args[0])
	//}

	return shim.Success(assetAsBytes)

	//return shim.Success([]byte("asset created: " + args[0]))
}

// 6. Get 함수
func (t *SimpleAsset) Get(stub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect arguments. Expecting a key")
	}

	value, err := stub.GetState(args[0])
	if err != nil {
		shim.Error("Failed to get asset: " + args[0] + "with error: " + err.Error())
	}
	if value == nil {
		shim.Error("Asset not found: " + args[0])
	}

	return shim.Success([]byte(value))//
}

func (t *SimpleAsset) Del(stub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect arguments. Expecting a key")
	}

	value, err := stub.GetState(args[0])
	if err != nil {
		shim.Error("Failed to get asset: " + args[0] + "with error: " + err.Error())
	}
	if value == nil {
		shim.Error("Asset not found: " + args[0])
	}

	stub.DelState(args[0])

	return shim.Success([]byte("asset delete tx has been submitted: " + args[0]))
}

func (t *SimpleAsset) Transfer(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 3 {
		return shim.Error("Incorrect arguments. Expecting a from_key, to_key and amount")
	}

	from_asset, err := stub.GetState(args[0])
	if err != nil {
		return shim.Error("Failed to get asset: " + args[0] + "with error" + err.Error())
	}
	if from_asset == nil {
		return shim.Error("Asset not found: " + args[0])
	}
	to_asset, err := stub.GetState(args[1])
	if err != nil {
		return shim.Error("Failed to get asset: " + args[1] + "with error: " + err.Error())
	}
	if to_asset == nil {
		return shim.Error("Asset not found: " + args[1])
	}
	from := Asset{}
	to := Asset{}
	json.Unmarshal(from_asset, &from)
	json.Unmarshal(to_asset, &to)

	from_amount, _ := strconv.Atoi(from.Value)
	to_amount, _ := strconv.Atoi(to.Value)
	amount, _ := strconv.Atoi(args[2])

	if (from_amount - amount) < 0 {
		return shim.Error("Not enough asset value: " + args[0])
	}

	from.Value = strconv.Itoa(from_amount - amount)
	to.Value = strconv.Itoa(to_amount + amount)
	
	from_asset, _ = json.Marshal(from)
	to_asset, _ = json.Marshal(to)

	stub.PutState(args[0], from_asset)
	stub.PutState(args[1], to_asset)

	return shim.Success([]byte("from " + args[0] + " to " + args[1] + " : " + args[2] + " transfer tx is submitted"))
}
// History 함수
func (t *SimpleAsset) History(stub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	assetName := args[0]

	fmt.Printf("- start getHistoryForAsset: %s\n", assetName)

	resultsIterator, err := stub.GetHistoryForKey(assetName) // GetStateByRange
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		response, err :=resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		if response.IsDelete {
			buffer.WriteString("null")
		} else {
			buffer.WriteString(string(response.Value))
		}

		buffer.WriteString(",\"Timestamp\":")
		buffer.WriteString("\"")
		buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
		buffer.WriteString("\"")

		buffer.WriteString(",\"IsDelete\":")
		buffer.WriteString("\"")
		buffer.WriteString(strconv.FormatBool(response.IsDelete))
		buffer.WriteString("\"")

		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- History returning :\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}
// 7. main 함수
func main() {
	if err := shim.Start(new(SimpleAsset)); err != nil {
		fmt.Printf("Error starting SimpleAsset chaincode: %s", err)
	}
}