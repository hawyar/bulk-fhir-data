import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import process from "process"

async function run() {
    const url = 'https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1IjozLCJkZWwiOjB9/fhir/$export'

    console.log(`Requesting bulk data from ${url}`)

    // request bulk export
    const request = await fetch(url, {
        headers: {
            'Accept': 'application/fhir+json',
            'prefer': 'respond-async'
        }
    })

    const outcome = await request.json()

    if (outcome.resourceType !== "OperationOutcome" || outcome.text.status !== "generated") {
        console.log("Error:", outcome)
        return
    }

    const exportURL = outcome.issue[0].diagnostics.match(/https:\/\/.*?"/)[0].replace(/"/g, "")

    console.log(`Export URL: ${exportURL}`)

    // wait for the export to finish
    await new Promise(resolve => setTimeout(resolve, 15000))

    // get the export metadata
    const exportRequest = await fetch(exportURL)

    const exports = await exportRequest.json()

    console.log(`Export Metadata: ${exports.request}`)

    if (!fs.existsSync(path.join(process.cwd(), "ndjson"))) {
        fs.mkdirSync(path.join(process.cwd(), "ndjson"))
    }

    if (!fs.existsSync(path.join(process.cwd(), "json"))) {
        fs.mkdirSync(path.join(process.cwd(), "json"))
    }

    exports.output.forEach(async resource => {

        // get the ndjson file
        const req = await fetch(resource.url)

        const base = path.basename(resource.url)

        const ndjson = await req.text()

        // convert to json
        const json = ndjson.trim().toString().split("\n").map(JSON.parse)

        // save both to disk
        fs.writeFileSync("ndjson/" + base, ndjson)
        fs.writeFileSync("json/" + base.replace(".ndjson", ".json"), JSON.stringify(json, null, 2))
    })
}

run().then(console.log("Done")).catch(console.error)