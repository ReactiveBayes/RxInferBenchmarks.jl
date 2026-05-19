## General Idea 

We are building a benchmark dashboard for the RxInfer package https://github.com/ReactiveBayes/RxInfer.jl.git, the idea in general is the following one we want to track performance metrics of the model inference through time: for example how long does it take to create a model, or/and how long does it take to compile the inference procedure, etc.

We already have a some very minor benchmark that is comparing RxInfer with other packages in Julia agains inference time (Turing.jl). You can find it here https://github.com/ReactiveBayes/RxInfer.jl/tree/main/benchmarks there we are comparing simple Linear State Space Model in memory allocations, inference time.

We want our dashboard be static to not hustle with the database so the workflow where we are run some script it records us smt into our repo as a csv row into pre-specified csv file and after a static site generators creates plot from that is fine.

# Specifics

### Non negotiable

We want to publish our github pages: basically static website is not a hard constraint but it could be only javascript in the html that can be executed only in the client side, not backed would be made.

We do not want to have a database for now. 

We want to be able to test this dashboard locally

We want script for the each model be uniform and look the same way, so it would be easy to read a new generated benchmark scripts, maybe in form of the Pluto notebooks? Or Jupyter notebooks? In a very specific manner that can signal writer of the script at the end that the script is not written in the correct manner.

# Negotiable

We have a tree structure in our RxInfer example that reads like this:

Type of an example -> List of Examples it would be nice for the dashboard to look in the similar way basically I am selecting of the possible examples and I see a graph of the metrics through time.

Maybe these graphs should be generate by Julia, but I am also fine for them to be generated on the fly by JS maybe it's even better? I don't know.

To get an idea what should be reported is a time in the events that RxInfer can generate:

https://docs.rxinfer.com/stable/manuals/inference/callbacks/#RxInfer-events. There is a flag in RxInfer infer function (Trace = True) that will at the end of the inference will give you a list of the events with a lot of information about them: execution time, memory allocation time, allocations itself, compilation time, etc. The idea is that we can re-use it for making actual scripts.

https://github.com/ReactiveBayes/RxInferExamples.jl

In some sense I see this repo in the following way:

master script that can go through the repo and execute each benchmark experiment one by one

# Prompts that I tried 

## UI prompt

I have a repo RxInferBenchmarks.jl created I am more worried right now about the actual UI for the humans that about the backend that is generating the JSONs/CSVs at
  the end I can do it by hand. However I am not very good with the JS so the actual UI should be very dump and simple stupid for me be able to change it by hand. So can
  you recreate example how dashboard site actually can look like RxInferExamples but with perfomance graphs over time (you suggested hashes but look hashes are very hard
  for humans to understand how it evolves and Performance vs Time is very easy to read). So any idea for quick and simple UI like that?