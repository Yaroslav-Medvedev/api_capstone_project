import express from "express"
import axios from "axios"

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true}));

app.get("/", async (req, res) => {
  try {
    const response = await axios.get(
        "https://api.datausa.io/tesseract/data.jsonrecords",
        {
            params: {
                cube: "acs_ygr_median_household_income_race_1",
                drilldowns: "State Place,Place,Year",
                measures: "Household Income by Race",
                include: "Race:0",
            },
        }
    );
    const incomeData = response.data.data;
    const housingResponse = await axios.get(
        "https://api.datausa.io/tesseract/data.jsonrecords",
        {
            params: {
                cube: "acs_yg_housing_median_value_1",
                drilldowns: "State Place,Place,Year",
                measures: "Property Value",
            },
        }
    );
    const housingData = housingResponse.data.data;
    const latestIncome = incomeData.filter(record => record.Year === 2024);
    const citiesWithIncomeHistory = latestIncome.map(record => {
        const oldRecord = incomeData.find(
            old => old["Place ID"] === record["Place ID"] && old.Year === 2014
        );
        return {
            placeId: record["Place ID"],
            city: record.Place,
            state: record["State Place"],
            income2024: record["Household Income by Race"],
            income2014: oldRecord
                ? oldRecord["Household Income by Race"]
                : null,
        };
    });

    const eligibleCities = citiesWithIncomeHistory.filter(
        city => city.income2014 !== null
    );

    const citiesWithHousing = eligibleCities.map(city => {
        const housingRecord = housingData.find(
            record =>
                record["Place ID"] === city.placeId &&
                record.Year === 2024
        );

        return {
            ...city,
            homeValue2024: housingRecord
                ? housingRecord["Property Value"]
                : null,
        };
    });

    const citiesWithMetrics = citiesWithHousing
        .filter(city => city.homeValue2024 > 0)
        .map(city => {
            return {
                ...city,
                incomeGrowth:
                    ((city.income2024 / city.income2014) - 1) * 100,
                valueToIncome:
                    city.homeValue2024 / city.income2024,
            };
        });
    
    const sortedByGrowth = [...citiesWithMetrics].sort(
        (a, b) => a.incomeGrowth - b.incomeGrowth
    );

    const citiesWithGrowthScore = sortedByGrowth.map((city, index) => {
        return {
            ...city,
            growthScore: (index / (sortedByGrowth.length - 1)) * 100,
        };
    });

    const sortedByAffordability = [...citiesWithGrowthScore].sort(
        (a, b) => b.valueToIncome - a.valueToIncome
    );

    const citiesWithBothScores = sortedByAffordability.map((city, index) => {
        return {
            ...city,
            affordabilityScore:
                (index / (sortedByAffordability.length - 1)) * 100,
        };
    });

    const rankedCities = citiesWithBothScores
        .map(city => {
            return {
                ...city,
                score: city.growthScore * 0.5 + city.affordabilityScore * 0.5,
            };
        })
        .sort((a, b) => b.score - a.score);

    const shortNames = {
        "Augusta-Richmond County consolidated government (balance), GA": "Augusta, GA",
        "Indianapolis city (balance), IN": "Indianapolis, IN",
        "Louisville/Jefferson County metro government (balance), KY": "Louisville, KY",
        "Nashville-Davidson metropolitan government (balance), TN": "Nashville, TN",
        "Athens-Clarke County unified government (balance), GA": "Athens, GA",
    };

    rankedCities.forEach(city => {
    city.displayName = shortNames[city.city] || city.city;
    });

    rankedCities.forEach((city, index) => {
        city.rank = index + 1;
    });

    const states = [...new Set(rankedCities.map(city => city.state))].sort();
    
    const search = (req.query.search || "").trim();
    const selectedState = req.query.state || "";

    console.log("Search:", search);
    console.log("Selected state:", selectedState);
    console.log("Dallas record:",
        rankedCities.find(city => city.displayName.includes("Dallas"))
    );

    const filteredCities = rankedCities.filter(city =>
        city.displayName.toLowerCase().includes(search.toLowerCase()) &&
        (selectedState === "" || city.state === selectedState)
    );

    const sort = req.query.sort || "score";

    if (sort === "income") {
        filteredCities.sort((a,b) => b.income2024 - a.income2024);
    } else if (sort === "incomeLow") {
        filteredCities.sort((a,b) => a.income2024- b.income2024);
    } else if (sort === "growth") {
        filteredCities.sort((a,b) => b.incomeGrowth - a.incomeGrowth);
    } else if (sort === "growthLow") {
        filteredCities.sort((a,b) => a.incomeGrowth - b.incomeGrowth);
    } else if (sort === "homeValue") {
        filteredCities.sort((a,b) => a.homeValue2024 - b.homeValue2024);
    } else if (sort === "homeValueHigh") {
        filteredCities.sort((a,b) => b.homeValue2024 - a.homeValue2024);
    } else if (sort === "affordability") {
        filteredCities.sort((a,b) => a.valueToIncome - b.valueToIncome);
    } else if (sort === "affordabilityHigh") {
        filteredCities.sort((a,b) => b.valueToIncome - a.valueToIncome);
    } else if (sort === "scoreLow") {
        filteredCities.sort((a,b) => a.score - b.score);
    } else {
        filteredCities.sort((a,b) => b.score - a.score);
    }

    res.render("index.ejs", {
        error: null,
        cities: filteredCities,
        search: search,
        states: states,
        selectedState: selectedState,
        sort: sort,
    });
  }
  catch (error) {
    res.status(500).render("index.ejs", {
        error: "Unable to load city data. Please try again later.",
    });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});