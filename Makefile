.PHONY: dashboard preview check-dashboard

dashboard:
	julia --startup-file=no scripts/generate_dashboard_data.jl

preview: dashboard
	@echo "Open docs/index.html in your browser:"
	@echo "file://$(CURDIR)/docs/index.html"

check-dashboard: dashboard
	node --check docs/dashboard.js
	node --check docs/data.js
