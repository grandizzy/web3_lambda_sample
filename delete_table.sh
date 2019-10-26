#!/usr/bin/env bash

aws dynamodb --region us-west-2 delete-table --table-name VoteBlock --endpoint-url http://localhost:8000