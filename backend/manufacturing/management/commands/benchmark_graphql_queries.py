import json
import time
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.test.utils import CaptureQueriesContext

from api.schema import schema
from manufacturing.models import Plant


OVERVIEW_QUERY = """
query BenchmarkDataManagementOverview($plantId: String, $search: String, $status: String, $includeTree: Boolean) {
  dataManagementOverview(plantId: $plantId, search: $search, status: $status, includeTree: $includeTree) {
    selectedPlant { id name code status }
    plants { id name code status }
    kpis { productionLines departments resourceGroups resources plantStatus }
    tree {
      id
      type
      name
      code
      status
      childCount
      children {
        id
        type
        name
        code
        status
        childCount
        children {
          id
          type
          name
          code
          status
          childCount
          children {
            id
            type
            name
            code
            status
            childCount
          }
        }
      }
    }
    navigationCounts { plants productionLines departments resourceGroups resources referenceTables }
    systemHealth { runningLines resourcesDown highUtilizationResources }
  }
}
"""

TREE_QUERY = """
query BenchmarkProductionStructureTree($plantId: String!, $search: String, $status: String) {
  productionStructureTree(plantId: $plantId, search: $search, status: $status) {
    id
        type
    name
    code
    status
        childCount
        children {
      id
            type
      name
      code
      status
            childCount
            children {
        id
                type
        name
        code
        status
                childCount
                children {
          id
                    type
          name
          code
          status
                    childCount
                    children {
            id
                        type
            name
            code
            status
                        childCount
          }
        }
      }
    }
  }
}
"""


class Command(BaseCommand):
    help = "Benchmark GraphQL DB query counts for dataManagementOverview and productionStructureTree"

    def add_arguments(self, parser):
        parser.add_argument("--runs", type=int, default=3, help="Number of runs per scenario (default: 3)")
        parser.add_argument("--plant-id", type=str, default=None, help="Optional Plant ID to benchmark")
        parser.add_argument("--search", type=str, default=None, help="Optional search term")
        parser.add_argument("--status", type=str, default=None, help="Optional status filter")
        parser.add_argument(
            "--output",
            type=str,
            default="benchmarks/graphql-query-benchmark.latest.json",
            help="Output JSON path",
        )
        parser.add_argument(
            "--compare-to",
            type=str,
            default=None,
            help="Optional baseline JSON path for before/after comparison",
        )

    def handle(self, *args, **options):
        runs = options["runs"]
        if runs < 1:
            raise CommandError("--runs must be at least 1")

        plant_id = options["plant_id"]
        if plant_id is None:
            plant = Plant.objects.order_by("id").first()
            if plant is None:
                raise CommandError("No Plant rows found. Seed data first before running benchmark.")
            plant_id = str(plant.id)

        search = options["search"]
        status = options["status"]

        scenarios = [
            {
                "name": "overview_before_include_tree_true",
                "query": OVERVIEW_QUERY,
                "variables": {
                    "plantId": plant_id,
                    "search": search,
                    "status": status,
                    "includeTree": True,
                },
            },
            {
                "name": "overview_after_include_tree_false",
                "query": OVERVIEW_QUERY,
                "variables": {
                    "plantId": plant_id,
                    "search": search,
                    "status": status,
                    "includeTree": False,
                },
            },
            {
                "name": "production_structure_tree_after",
                "query": TREE_QUERY,
                "variables": {
                    "plantId": plant_id,
                    "search": search,
                    "status": status,
                },
            },
        ]

        results: dict[str, Any] = {
            "meta": {
                "runs": runs,
                "plant_id": plant_id,
                "search": search,
                "status": status,
                "database_vendor": connection.vendor,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
            "scenarios": {},
        }

        for scenario in scenarios:
            scenario_result = self._benchmark_scenario(
                scenario_name=scenario["name"],
                query=scenario["query"],
                variables=scenario["variables"],
                runs=runs,
            )
            results["scenarios"][scenario["name"]] = scenario_result

        output_path = Path(options["output"]).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"Wrote benchmark output to {output_path}"))
        self._print_summary(results)

        compare_to = options["compare_to"]
        if compare_to:
            baseline_path = Path(compare_to).resolve()
            if not baseline_path.exists():
                raise CommandError(f"--compare-to file does not exist: {baseline_path}")

            baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
            self._print_comparison(baseline, results)

    def _benchmark_scenario(self, scenario_name: str, query: str, variables: dict[str, Any], runs: int) -> dict[str, Any]:
        query_counts = []
        durations_ms = []

        for _ in range(runs):
            start = time.perf_counter()
            with CaptureQueriesContext(connection) as ctx:
                result = schema.execute_sync(query, variable_values=variables)
            duration_ms = (time.perf_counter() - start) * 1000

            if result.errors:
                raise CommandError(
                    f"Scenario '{scenario_name}' failed: "
                    + "; ".join(str(error) for error in result.errors)
                )

            query_counts.append(len(ctx.captured_queries))
            durations_ms.append(duration_ms)

        avg_queries = sum(query_counts) / len(query_counts)
        avg_duration_ms = sum(durations_ms) / len(durations_ms)

        return {
            "query_counts": query_counts,
            "durations_ms": [round(value, 3) for value in durations_ms],
            "avg_query_count": round(avg_queries, 3),
            "avg_duration_ms": round(avg_duration_ms, 3),
            "min_query_count": min(query_counts),
            "max_query_count": max(query_counts),
            "min_duration_ms": round(min(durations_ms), 3),
            "max_duration_ms": round(max(durations_ms), 3),
        }

    def _print_summary(self, results: dict[str, Any]) -> None:
        self.stdout.write("\nGraphQL Query Benchmark Summary")
        self.stdout.write("-" * 40)

        scenarios = results.get("scenarios", {})
        for name, data in scenarios.items():
            self.stdout.write(
                f"{name}: avg_queries={data['avg_query_count']} "
                f"avg_ms={data['avg_duration_ms']}"
            )

    def _print_comparison(self, baseline: dict[str, Any], current: dict[str, Any]) -> None:
        self.stdout.write("\nComparison vs baseline")
        self.stdout.write("-" * 40)

        baseline_scenarios = baseline.get("scenarios", {})
        current_scenarios = current.get("scenarios", {})

        for name, current_data in current_scenarios.items():
            base_data = baseline_scenarios.get(name)
            if not base_data:
                self.stdout.write(f"{name}: no baseline scenario found")
                continue

            query_delta = round(current_data["avg_query_count"] - base_data.get("avg_query_count", 0), 3)
            ms_delta = round(current_data["avg_duration_ms"] - base_data.get("avg_duration_ms", 0), 3)

            self.stdout.write(
                f"{name}: delta_queries={query_delta:+} delta_ms={ms_delta:+}"
            )
