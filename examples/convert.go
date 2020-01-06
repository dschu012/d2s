package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"os"

	"github.com/nokka/d2s"
)

func main() {
	file, err := os.Open(os.Args[1])
	if err != nil {
		log.Fatal("Error while opening .d2s file", err)
	}

	defer file.Close()

	char, err := d2s.Parse(file)
	if err != nil {
		log.Fatal(err)
	}
	charJson, err := json.Marshal(char)
	ioutil.WriteFile(os.Args[2], charJson, 0644)
}
