import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allocateTripBudget } from "@/lib/smart-trip-planner/budget-allocation";
import { buildSmartTripPlan } from "@/lib/services/smart-trip-pricing";

const plannerSchema = z
  .object({
    mode: z.enum(["known_destination", "open_destination"]),
    originCity: z.string().trim().optional(),
    destinationCity: z.string().trim().optional(),
    departureDate: z.string().trim().min(1, "departureDate is required"),
    returnDate: z.string().trim().min(1, "returnDate is required"),
    travelers: z.number().int().positive(),
    totalBudget: z.number().positive(),
    currency: z.string().trim().min(1, "currency is required"),
    interests: z.array(z.string().trim()).default([]),
    tripStyle: z.enum(["economy", "comfort", "luxury"]),
    components: z.object({
      hotel: z.boolean(),
      flight: z.boolean(),
      car: z.boolean(),
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.components.hotel && !data.components.flight && !data.components.car) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one trip component must be selected",
        path: ["components"],
      });
    }

    if (data.mode === "known_destination" && !data.destinationCity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "destinationCity is required for known_destination mode",
        path: ["destinationCity"],
      });
    }

    if (data.mode === "open_destination" && !data.originCity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "originCity is required for open_destination mode",
        path: ["originCity"],
      });
    }
  });

type PlannerInput = z.infer<typeof plannerSchema>;

function calculateNights(departureDate: string, returnDate: string) {
  const departure = new Date(departureDate);
  const returns = new Date(returnDate);

  if (Number.isNaN(departure.getTime()) || Number.isNaN(returns.getTime())) {
    throw new Error("Invalid departureDate or returnDate");
  }

  const nights = Math.ceil((returns.getTime() - departure.getTime()) / 86_400_000);

  if (nights <= 0) {
    throw new Error("returnDate must be after departureDate");
  }

  return nights;
}

function devOnlyDestinationSuggestions(input: PlannerInput, nights: number) {
  if (process.env.NODE_ENV === "production") {
    return {
      suggestions: [],
      message:
        "Live destination recommendation providers are not configured yet.",
    };
  }

  const destinations = [
    {
      city: "Istanbul",
      country: "Turkey",
      interests: ["shopping", "restaurants", "history", "family"],
      qualityScore: 86,
    },
    {
      city: "Dubai",
      country: "United Arab Emirates",
      interests: ["luxury", "shopping", "events", "family"],
      qualityScore: 92,
    },
    {
      city: "Tbilisi",
      country: "Georgia",
      interests: ["nature", "restaurants", "relaxation", "adventure"],
      qualityScore: 81,
    },
  ];
  const selectedInterestText = input.interests.join(" ").toLowerCase();

  return {
    suggestions: destinations
      .map((destination) => {
        const interestMatches = destination.interests.filter((interest) =>
          selectedInterestText.includes(interest),
        ).length;
        const estimatedTotal = Math.round(
          input.totalBudget * (0.62 + (100 - destination.qualityScore) / 500),
        );
        const remainingBudget = input.totalBudget - estimatedTotal;

        return {
          city: destination.city,
          country: destination.country,
          nights,
          estimatedTotal,
          remainingBudget,
          matchPercentage: Math.min(
            96,
            Math.max(
              55,
              destination.qualityScore - 10 + interestMatches * 7 + (remainingBudget >= 0 ? 8 : -12),
            ),
          ),
          reason:
            "Development-only planning suggestion. Replace with live destination intelligence before production use.",
        };
      })
      .sort((a, b) => {
        const budgetFitDiff =
          Number(b.remainingBudget >= 0) - Number(a.remainingBudget >= 0);

        if (budgetFitDiff !== 0) return budgetFitDiff;
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }

        return b.remainingBudget - a.remainingBudget;
      }),
    message:
      "Development-only suggestions returned. Production returns no synthetic destinations until real providers are configured.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const parsed = plannerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid smart trip planner input",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const nights = calculateNights(input.departureDate, input.returnDate);
    const budgetAllocation = allocateTripBudget({
      totalBudget: input.totalBudget,
      travelers: input.travelers,
      nights,
      tripStyle: input.tripStyle,
      components: input.components,
    });

    if (input.mode === "known_destination") {
      const plan = await buildSmartTripPlan({
        origin: input.originCity,
        destination: input.destinationCity || "",
        checkIn: input.departureDate,
        checkOut: input.returnDate,
        travelers: { total: input.travelers },
        totalBudget: input.totalBudget,
        nights,
        currency: input.currency,
        interests: input.interests,
        tripStyle: input.tripStyle,
        components: input.components,
      });

      return NextResponse.json({
        success: true,
        mode: input.mode,
        nights,
        budgetAllocation,
        result: {
          type: "known_destination_plan",
          plan,
        },
        note: "Planning only. No booking was created.",
      });
    }

    const destinationResult = devOnlyDestinationSuggestions(input, nights);

    return NextResponse.json({
      success: true,
      mode: input.mode,
      nights,
      budgetAllocation,
      result: {
        type: "open_destination_suggestions",
        ...destinationResult,
      },
      note: "Planning only. No booking was created.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to build smart trip planner response",
      },
      { status: 500 },
    );
  }
}
